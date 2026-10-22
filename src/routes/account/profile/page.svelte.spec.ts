import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ProfilePage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

// `use:enhance` without the network: the mock keeps each form's submit
// function so a test can run it and hand it the action's result.
const forms = vi.hoisted(() => {
	const submits = new Map<HTMLFormElement, SubmitFunction>();
	return {
		submits,
		enhance: vi.fn((form: HTMLFormElement, submit: SubmitFunction) => {
			submits.set(form, submit);
			return { destroy: () => void submits.delete(form) };
		}),
		applyAction: vi.fn(async () => {})
	};
});
vi.mock('$app/forms', () => ({ enhance: forms.enhance, applyAction: forms.applyAction }));

const PROFILE = {
	username: 'ada',
	full_name: 'Ada Lovelace',
	employer: 'Analytical Engines',
	website: 'https://ada.example.com',
	phone_number: '+44 20 7946 0000',
	email: 'ada@example.com',
	line_id: null
};

interface DataInit {
	profile?: Record<string, unknown> | null;
	email?: string | null;
	role?: string | null;
	lineLinked?: boolean;
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(init: DataInit = {}, form: Record<string, unknown> | null = null) {
	const services = createMockServices();
	// The push card on this page lists the account's devices.
	services.push.getPushDevices.mockResolvedValue([]);
	view = renderWithServices(ProfilePage, {
		props: {
			data: {
				profile: 'profile' in init ? init.profile : PROFILE,
				email: 'email' in init ? init.email : 'ada@example.com',
				role: 'role' in init ? init.role : 'admin',
				lineLinked: init.lineLinked ?? false
			},
			form
		} as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	goto.mockReset();
	forms.applyAction.mockClear();
	vi.restoreAllMocks();
});

const text = () => document.body.textContent ?? '';
const formFor = (action: string) =>
	document.querySelector<HTMLFormElement>(`form[action="?/${action}"]`);
const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const submitButton = (action: string) =>
	formFor(action)?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;

function type(name: string, value: string) {
	const field = input(name);
	if (!field) throw new Error(`No input "${name}"`);
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/**
 * Runs a form's enhance callback as SvelteKit would: the submit function
 * first (`saving` starts), then — unless it cancelled — the result handler.
 */
async function submit(action: string, result?: ActionResult) {
	const form = formFor(action);
	const submitFn = form && forms.submits.get(form);
	if (!form || !submitFn) throw new Error(`No enhanced form for ?/${action}`);
	const cancel = vi.fn();
	const url = new URL(`http://localhost/account/profile?/${action}`);
	const formData = new FormData(form);
	const after = await submitFn({
		action: url,
		formData,
		formElement: form,
		controller: new AbortController(),
		submitter: null,
		cancel
	});
	flushSync();
	const finish = async (outcome: ActionResult) => {
		if (typeof after === 'function') {
			await after({ action: url, formData, formElement: form, result: outcome, update: vi.fn() });
		}
		flushSync();
	};
	if (result) await finish(result);
	return { cancel, after, formData, finish };
}

describe('profile page: identity', () => {
	it('fills the form from the profile and shows the role', () => {
		render();

		expect(input('username')?.value).toBe('ada');
		expect(input('full_name')?.value).toBe('Ada Lovelace');
		expect(input('employer')?.value).toBe('Analytical Engines');
		expect(input('website')?.value).toBe('https://ada.example.com');
		expect(input('phone_number')?.value).toBe('+44 20 7946 0000');
		expect(input('email')?.value).toBe('ada@example.com');
		expect([...document.querySelectorAll('.cw-chip')].map((el) => el.textContent?.trim())).toEqual([
			'admin'
		]);
	});

	it('starts empty without a profile or role', () => {
		render({ profile: null, email: null, role: null });

		for (const name of ['username', 'full_name', 'employer', 'website', 'phone_number', 'email']) {
			expect(input(name)?.value, name).toBe('');
		}
		expect(document.querySelector('.cw-chip')).toBeNull();
	});

	it('flags a website that is not a domain or URL', () => {
		render();

		for (const [value, valid] of [
			['cropwatch.io', true],
			['https://cropwatch.io/about', true],
			['localhost', false],
			// Not parseable as a URL at all.
			['https://', false],
			['', true]
		] as const) {
			type('website', value);
			expect(text().includes(m.profile_website_invalid()), value).toBe(!valid);
			expect(submitButton('updateProfile')?.disabled, value).toBe(!valid);
		}
	});

	it('saves the profile as typed, then reloads it', async () => {
		const { toasts } = render();
		const typed = {
			username: 'ada-l',
			full_name: 'Augusta Ada King',
			employer: 'Babbage & Co',
			website: 'ada.example.org',
			phone_number: '+44 20 7946 0001'
		};
		for (const [name, value] of Object.entries(typed)) type(name, value);

		const { formData, finish } = await submit('updateProfile');
		expect(Object.fromEntries(formData)).toEqual(typed);
		expect(submitButton('updateProfile')?.disabled).toBe(true);

		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(submitButton('updateProfile')?.disabled).toBe(false);
		expect(toasts().at(-1)).toMatchObject({ tone: 'success', message: m.profile_saved() });
		expect(goto).toHaveBeenCalledWith('/account/profile', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
	});

	it('shows why saving failed', async () => {
		const { toasts } = render();
		const failure: ActionResult = {
			type: 'failure',
			status: 409,
			data: { error: 'Username taken' }
		};

		await submit('updateProfile', failure);

		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(toasts().at(-1)).toMatchObject({ tone: 'danger', message: 'Username taken' });
		expect(goto).not.toHaveBeenCalled();

		await submit('updateProfile', { type: 'error', status: 500, error: new Error('boom') });
		expect(toasts()).toHaveLength(1);
	});

	it("shows the action's error above the form", () => {
		render({}, { error: 'Username taken' });

		expect(formFor('updateProfile')?.querySelector('.app-notice--danger')?.textContent).toContain(
			'Username taken'
		);
	});

	it('goes back to the dashboard', () => {
		render();

		const back = [...document.querySelectorAll('button')].find((button) =>
			button.textContent?.includes(m.action_back())
		);
		back?.click();

		expect(goto).toHaveBeenCalledWith('/');
	});
});

describe('profile page: email', () => {
	it('sends a confirmation for a changed address', async () => {
		const { toasts } = render();
		expect(submitButton('updateEmail')?.disabled).toBe(true);

		type('email', ' ada@new.example.com ');
		expect(submitButton('updateEmail')?.disabled).toBe(false);
		const success: ActionResult = {
			type: 'success',
			status: 200,
			data: { emailPending: true, emailMessage: null, email: 'ada@new.example.com' }
		};
		const { cancel, finish } = await submit('updateEmail');
		expect(cancel).not.toHaveBeenCalled();
		expect(submitButton('updateEmail')?.disabled).toBe(true);
		await finish(success);

		expect(forms.applyAction).toHaveBeenCalledWith(success);
		expect(toasts().at(-1)).toMatchObject({ tone: 'info', message: m.profile_email_sent() });
		expect(submitButton('updateEmail')?.disabled).toBe(false);
	});

	it('shows why the change failed', async () => {
		const { toasts } = render();
		type('email', 'taken@example.com');

		await submit('updateEmail', {
			type: 'failure',
			status: 422,
			data: { emailError: 'Address in use' }
		});
		expect(toasts().at(-1)).toMatchObject({ tone: 'danger', message: 'Address in use' });

		await submit('updateEmail', { type: 'failure', status: 400, data: {} });
		expect(toasts()).toHaveLength(1);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
	});

	it('shows a pending change and its errors', () => {
		const notice = (tone: string) =>
			formFor('updateEmail')?.querySelector(`.app-notice--${tone}`)?.textContent?.trim();

		render({}, { emailPending: true, emailMessage: 'Check your inbox' });
		expect(notice('info')).toBe('Check your inbox');
		expect(notice('danger')).toBeUndefined();
		view?.unmount();

		render({}, { emailPending: true, emailMessage: null });
		expect(notice('info')).toBe(m.profile_email_pending());
		view?.unmount();

		render({}, { emailError: 'Address in use' });
		expect(notice('danger')).toBe('Address in use');
		expect(notice('info')).toBeUndefined();
	});

	it('locks a CropWatch address and refuses to submit it', async () => {
		const { toasts } = render({ email: 'Staff@CropWatch.co.jp ' });

		expect(formFor('updateEmail')?.querySelector('.app-notice--danger')?.textContent).toContain(
			m.profile_email_locked()
		);
		expect(input('email')?.disabled).toBe(true);
		expect(submitButton('updateEmail')?.disabled).toBe(true);

		const { cancel, after } = await submit('updateEmail');

		expect(cancel).toHaveBeenCalledTimes(1);
		expect(after).toBeUndefined();
		expect(toasts().at(-1)).toMatchObject({ tone: 'danger', message: m.profile_email_locked() });
	});

	it('does not lock other addresses', () => {
		render({ email: 'ada@cropwatch.io.example.com' });

		expect(input('email')?.disabled).toBe(false);
		expect(formFor('updateEmail')?.textContent).not.toContain(m.profile_email_locked());
	});
});

describe('profile page: LINE', () => {
	it('unlinks a linked LINE account, then reloads', async () => {
		const { toasts } = render({ lineLinked: true });
		expect(document.querySelector('.app-notice--success')?.textContent).toContain(
			m.line_linked_notice()
		);
		expect(formFor('lineLinkCode')).toBeNull();

		const { finish } = await submit('unlinkLine');
		expect(submitButton('unlinkLine')?.disabled).toBe(true);
		await finish({ type: 'success', status: 200, data: { lineUnlinked: true } });

		expect(toasts().at(-1)).toMatchObject({ tone: 'success', message: m.line_unlinked() });
		expect(goto).toHaveBeenCalledWith('/account/profile', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
	});

	it('shows why unlinking failed', async () => {
		const { toasts } = render({ lineLinked: true });
		const failure: ActionResult = {
			type: 'failure',
			status: 500,
			data: { lineError: 'Unlink failed' }
		};

		await submit('unlinkLine', failure);
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(toasts().at(-1)).toMatchObject({ tone: 'danger', message: 'Unlink failed' });

		await submit('unlinkLine', { type: 'failure', status: 500, data: {} });
		expect(toasts()).toHaveLength(1);
		expect(submitButton('unlinkLine')?.disabled).toBe(false);
	});

	it('offers the LINE friend link and a link code when not linked', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		render();

		expect(text()).toContain(m.line_not_linked_notice());
		expect(text()).toContain(m.line_code_instructions());
		expect(formFor('unlinkLine')).toBeNull();
		const friend = [...(formFor('lineLinkCode')?.querySelectorAll('button') ?? [])].find((button) =>
			button.textContent?.includes(m.line_add_friend_action())
		);
		friend?.click();
		expect(open).toHaveBeenCalledWith('https://line.me/R/ti/p/@cropwatch', '_blank', 'noopener');

		expect(submitButton('lineLinkCode')?.textContent).toContain(m.line_code_action());
		const result: ActionResult = {
			type: 'success',
			status: 200,
			data: { lineCode: '123456', lineCodeExpiresAt: '2026-10-21T00:10:00Z' }
		};
		const { finish } = await submit('lineLinkCode');
		expect(submitButton('lineLinkCode')?.disabled).toBe(true);
		await finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(submitButton('lineLinkCode')?.disabled).toBe(false);
	});

	it('shows the link code and offers a new one', () => {
		render({}, { lineCode: '123456' });

		expect(document.querySelector('.line-code')?.closest('.app-notice--success')).not.toBeNull();
		expect(document.querySelector('.line-code')?.textContent).toBe('123456');
		expect(text()).toContain(m.line_code_send_hint());
		expect(submitButton('lineLinkCode')?.textContent).toContain(m.line_code_refresh_action());
	});

	it('shows LINE errors', async () => {
		const { toasts } = render({}, { lineError: 'LINE is down' });
		expect(
			[...document.querySelectorAll('.app-notice--danger')].map((el) => el.textContent?.trim())
		).toContain('LINE is down');

		await submit('lineLinkCode', {
			type: 'failure',
			status: 503,
			data: { lineError: 'Still down' }
		});
		expect(toasts().at(-1)).toMatchObject({ tone: 'danger', message: 'Still down' });

		await submit('lineLinkCode', { type: 'failure', status: 503, data: {} });
		expect(toasts()).toHaveLength(1);
	});
});
