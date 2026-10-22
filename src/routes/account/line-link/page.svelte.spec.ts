import type { SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LineLinkPage from './+page.svelte';

// `use:enhance` without the network: the mock keeps the form's submit function.
const forms = vi.hoisted(() => {
	const submits = new Map<HTMLFormElement, SubmitFunction>();
	return {
		submits,
		enhance: vi.fn((form: HTMLFormElement, submit: SubmitFunction) => {
			submits.set(form, submit);
			return { destroy: () => void submits.delete(form) };
		})
	};
});
vi.mock('$app/forms', () => ({ enhance: forms.enhance }));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	data: { linkToken: string | null; email: string | null },
	form: { error?: string } | null = null
) {
	view = renderWithServices(LineLinkPage, { props: { data, form } as never });
	return view;
}

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
});

const form = () => document.querySelector<HTMLFormElement>('form[method="POST"]');
const confirmButton = () => form()?.querySelector<HTMLButtonElement>('button[type="submit"]');

describe('LINE link page', () => {
	it('explains a link without a token, with nothing to confirm', () => {
		render({ linkToken: null, email: 'ada@example.com' });

		expect(document.querySelector('.app-notice--danger')?.textContent).toContain(
			m.line_link_missing_token()
		);
		expect(form()).toBeNull();
	});

	it('asks to confirm linking this account, posting the link token', () => {
		render({ linkToken: 'tok-1', email: 'ada@example.com' });

		expect(document.body.textContent).toContain(m.line_link_confirm_title());
		expect(document.body.textContent).toContain(
			m.line_link_confirm_body({ email: 'ada@example.com' })
		);
		const hidden = form()?.querySelector<HTMLInputElement>(
			'input[type="hidden"][name="linkToken"]'
		);
		expect(hidden?.value).toBe('tok-1');
		expect(confirmButton()?.textContent).toContain(m.line_link_confirm_action());
		expect(document.querySelector('.app-notice--danger')).toBeNull();
	});

	it('names no email when the account has none', () => {
		render({ linkToken: 'tok-1', email: null });

		expect(document.body.textContent).toContain(m.line_link_confirm_body({ email: '' }));
	});

	it("shows the action's error", () => {
		render({ linkToken: 'tok-1', email: 'ada@example.com' }, { error: 'Already linked' });

		expect(form()?.querySelector('.app-notice--danger')?.textContent).toContain('Already linked');
	});

	it('shows progress while linking, then applies the result', async () => {
		render({ linkToken: 'tok-1', email: 'ada@example.com' });
		const element = form();
		const submit = element && forms.submits.get(element);
		if (!element || !submit) throw new Error('The form is not enhanced');

		const formData = new FormData(element);
		const action = new URL('http://localhost/account/line-link');
		const after = await submit({
			action,
			formData,
			formElement: element,
			controller: new AbortController(),
			submitter: null,
			cancel: vi.fn()
		});
		flushSync();
		expect(formData.get('linkToken')).toBe('tok-1');
		expect(confirmButton()?.disabled).toBe(true);

		const update = vi.fn(async () => {});
		if (typeof after !== 'function') throw new Error('Expected a result handler');
		await after({
			action,
			formData,
			formElement: element,
			result: { type: 'failure', status: 409, data: { error: 'Already linked' } },
			update
		});
		flushSync();

		expect(update).toHaveBeenCalledWith();
		expect(confirmButton()?.disabled).toBe(false);
	});
});
