import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvitePreviewDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import InvitePage from './+page.svelte';

// Boundaries: the SvelteKit runtime (navigation, form enhancement).
const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

// `use:enhance` without the network: the mock keeps the form's submit
// function so a test can run it as SvelteKit does and hand it a result.
const forms = vi.hoisted(() => ({
	submit: null as SubmitFunction | null,
	applyAction: vi.fn(async () => {})
}));
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: SubmitFunction) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

const PREVIEW: InvitePreviewDto = {
	org_name: 'Kitchen Co.',
	role: 'manager',
	status: 'pending',
	masked_email: 'a***@example.com',
	invited_by: 'Kevin Tanaka',
	expires_at: '2026-11-01T00:00:00Z'
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	data: { preview?: InvitePreviewDto | null; loggedIn?: boolean; token?: string } = {},
	form: Record<string, unknown> | null = null
) {
	view = renderWithServices(InvitePage, {
		props: {
			data: {
				preview: 'preview' in data ? data.preview : PREVIEW,
				loggedIn: data.loggedIn ?? true,
				token: data.token ?? 'tok-123'
			},
			form
		} as never
	});
	return view;
}

const details = () =>
	[...document.querySelectorAll('.invite-details__row')].map((row) => [
		row.querySelector('dt')?.textContent,
		row.querySelector('dd')?.textContent
	]);
const notice = (tone: string) =>
	document.querySelector(`.app-notice--${tone}`)?.textContent?.trim() ?? null;
const button = (label: string) =>
	[...document.querySelectorAll('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	) as HTMLButtonElement | undefined;
const acceptForm = () => document.querySelector<HTMLFormElement>('form[action="?/accept"]');

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	const formElement = acceptForm();
	if (!forms.submit || !formElement) throw new Error('the form is not enhanced');
	const action = new URL('http://localhost/auth/invite/tok-123?/accept');
	const formData = new FormData(formElement);
	const cancel = vi.fn();
	const after = await forms.submit({
		action,
		formData,
		formElement,
		controller: new AbortController(),
		submitter: button(m.invite_accept()) ?? null,
		cancel
	});
	flushSync();
	const finish = async (result: ActionResult) => {
		if (typeof after === 'function') {
			await after({ action, formData, formElement, result, update: vi.fn() });
		}
		flushSync();
	};
	return { cancel, after, formData, finish };
}

/**
 * Full page loads (`window.location.assign`) are recorded and cancelled
 * through the Navigation API, so the test page stays put.
 */
async function clickAndCatchPageLoad(target: HTMLElement | undefined) {
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const urls: string[] = [];
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	try {
		target?.click();
		await expect.poll(() => urls).toHaveLength(1);
		return urls[0].slice(window.location.origin.length);
	} finally {
		navigation.removeEventListener('navigate', onNavigate);
	}
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	goto.mockReset();
});

describe('invite page', () => {
	it('shows who invited the user to which organisation, and until when', () => {
		render();

		expect(document.title).toBe(m.invite_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.invite_heading());
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(details()).toEqual([
			[m.invite_org_label(), 'Kitchen Co.'],
			[m.invite_role_label(), m.org_role_manager()],
			[m.invite_email_label(), 'a***@example.com'],
			[m.invite_invited_by(), 'Kevin Tanaka'],
			[m.invite_expires(), new Date('2026-11-01T00:00:00Z').toLocaleDateString()]
		]);
		expect(notice('danger')).toBeNull();
	});

	it('fills in what the preview does not say', () => {
		render({ preview: { ...PREVIEW, org_name: null, invited_by: null, role: 'staff' } });

		expect(details()).toEqual([
			[m.invite_org_label(), m.common_not_available()],
			[m.invite_role_label(), m.common_not_available()],
			[m.invite_email_label(), 'a***@example.com'],
			[m.invite_expires(), new Date('2026-11-01T00:00:00Z').toLocaleDateString()]
		]);
	});

	it('says CropWatch support sent an invitation from staff, without naming them', () => {
		render({ preview: { ...PREVIEW, invited_by: null, invited_by_staff: true } });

		expect(details()).toContainEqual([m.invite_invited_by(), m.common_staff_author()]);
	});

	it.each([
		['missing', null],
		['already accepted', { ...PREVIEW, status: 'accepted' }],
		['revoked', { ...PREVIEW, status: 'revoked' }]
	])('says the invitation was not found when it is %s', (_label, preview) => {
		render({ preview });

		expect(notice('danger')).toBe(m.invite_not_found());
		expect(details()).toEqual([]);
		expect(acceptForm()).toBeNull();
		expect(button(m.invite_sign_in())).toBeUndefined();
	});

	it('offers a signed-in user to accept', () => {
		render({ loggedIn: true });

		expect(acceptForm()?.method).toBe('post');
		expect(button(m.invite_accept())?.type).toBe('submit');
		expect(notice('info')).toBeNull();
		expect(button(m.invite_sign_in())).toBeUndefined();
	});

	it('joins the organisation and opens the dashboard', async () => {
		const { toasts } = render();

		const { finish } = await submit();
		expect(button(m.invite_accept())?.getAttribute('aria-busy')).toBe('true');
		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(toasts()).toMatchObject([{ tone: 'success', message: m.invite_accepted() }]);
		expect(goto).toHaveBeenCalledWith('/', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(button(m.invite_accept())?.getAttribute('aria-busy')).toBeNull();
	});

	it('applies a failure and stays on the page', async () => {
		const { toasts } = render();
		const result: ActionResult = {
			type: 'failure',
			status: 409,
			data: { error: m.invite_conflict() }
		};

		await (await submit()).finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(goto).not.toHaveBeenCalled();
		expect(toasts()).toEqual([]);
		expect(button(m.invite_accept())?.getAttribute('aria-busy')).toBeNull();
	});

	it("shows the action's error above the accept button", () => {
		render({}, { error: m.invite_conflict() });

		expect(notice('danger')).toBe(m.invite_conflict());
		expect(details()).toHaveLength(5);
		expect(button(m.invite_accept())).toBeDefined();
	});

	it('asks a signed-out user to sign in or create an account first', () => {
		render({ loggedIn: false });

		expect(notice('info')).toBe(m.invite_login_prompt());
		expect(acceptForm()).toBeNull();
		expect(button(m.invite_sign_in())?.className).toContain('cw-button--primary');
		expect(button(m.invite_create_account())?.className).toContain('cw-button--secondary');
	});

	it('comes back to this invitation after signing in', async () => {
		render({ loggedIn: false, token: 'tok-123' });

		await expect(clickAndCatchPageLoad(button(m.invite_sign_in()))).resolves.toBe(
			'/auth/login?redirect=%2Fauth%2Finvite%2Ftok-123'
		);
	});

	it('comes back to this invitation after creating a personal account', async () => {
		render({ loggedIn: false, token: 'tok-123' });

		await expect(clickAndCatchPageLoad(button(m.invite_create_account()))).resolves.toBe(
			'/auth/create-account?invite=1&redirect=%2Fauth%2Finvite%2Ftok-123'
		);
	});
});
