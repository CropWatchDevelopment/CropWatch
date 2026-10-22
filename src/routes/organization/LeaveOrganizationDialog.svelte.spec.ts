import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, textResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import LeaveOrganizationDialog from './LeaveOrganizationDialog.svelte';

const { goto, forms } = vi.hoisted(() => ({
	goto: vi.fn(),
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

/** The page's own `?/leave` action, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(LeaveOrganizationDialog, { props: { open: true } });
	flushSync();
	return view;
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog')!;
const button = (label: string) =>
	[...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	)!;
const leaveButton = () => button(m.organization_leave());

beforeEach(() => {
	respond = () => jsonResponse({ type: 'success', status: 200, data: { success: true } });
	fake = createFakeFetch((request) => respond(request));
	vi.stubGlobal('fetch', fake.fetch);
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.unstubAllGlobals();
	goto.mockReset();
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
});

describe('LeaveOrganizationDialog', () => {
	it('asks to confirm leaving the organization', () => {
		render();

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.organization_leave_title()
		);
		expect(dialog().textContent).toContain(m.organization_leave_body());
	});

	it("leaves through the page's own action, then goes to the dashboard with fresh data", async () => {
		const view = render();

		leaveButton().click();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		flushSync();
		const request = fake.onlyRequest();
		expect(request).toMatchObject({ url: '?/leave', method: 'POST' });
		const body = vi.mocked(fake.fetch).mock.calls[0]?.[1]?.body;
		expect(body).toBeInstanceOf(FormData);
		expect([...(body as FormData).entries()]).toEqual([]);
		expect(goto).toHaveBeenCalledWith('/', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: m.organization_left() }]);
		expect(dialog().open).toBe(false);
	});

	it("stays open and shows the action's error", async () => {
		const failure = { type: 'failure', status: 403, data: { error: 'The owner cannot leave' } };
		respond = () => jsonResponse(failure);
		const view = render();

		leaveButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'The owner cannot leave' }]);
		expect(goto).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(leaveButton().disabled).toBe(false);
	});

	it('applies other results without a toast', async () => {
		const view = render();
		const results = [
			{ type: 'failure', status: 400 },
			{ type: 'failure', status: 400, data: { error: 7 } },
			{ type: 'redirect', status: 303, location: '/auth/login' },
			{ type: 'error', status: 500, error: { message: 'boom' } }
		];

		for (const [index, result] of results.entries()) {
			respond = () => jsonResponse(result);
			leaveButton().click();
			await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledTimes(index + 1));
			await vi.waitFor(() => expect(leaveButton().disabled).toBe(false));
		}

		expect(forms.applyAction.mock.calls.map(([result]) => result)).toEqual(results);
		expect(view.toasts()).toEqual([]);
		expect(goto).not.toHaveBeenCalled();
	});

	it('shows the generic error when the request or its answer fails', async () => {
		const view = render();

		respond = () => Promise.reject(new TypeError('Failed to fetch'));
		leaveButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(leaveButton().disabled).toBe(false));
		respond = () => textResponse('<html>not an action result</html>', { contentType: 'text/html' });
		leaveButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: m.generic_error() },
			{ tone: 'danger', message: m.generic_error() }
		]);
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
	});

	it('leaves only once while the request is running', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		render();

		leaveButton().click();
		flushSync();
		expect(leaveButton().disabled).toBe(true);
		expect(leaveButton().getAttribute('aria-busy')).toBe('true');
		leaveButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(goto).toHaveBeenCalled());
		expect(fake.requests).toHaveLength(1);
	});

	it('closes on cancel without leaving', () => {
		render();

		button(m.action_cancel()).click();
		flushSync();

		expect(dialog().open).toBe(false);
		expect(fake.requests).toHaveLength(0);
	});
});
