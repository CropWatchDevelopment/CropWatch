import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { CW_EMPTY_VALUE } from '@cropwatchdevelopment/cwui';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBillingCustomer } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import AdminBillingPage from './+page.svelte';

const { goto, forms } = vi.hoisted(() => {
	const submits = new Map<HTMLFormElement, SubmitFunction>();
	return {
		goto: vi.fn(),
		forms: {
			submits,
			// `use:enhance` without the network: keep each row form's submit
			// function so a test can run it, and never let the browser submit.
			enhance: vi.fn((form: HTMLFormElement, submit: SubmitFunction) => {
				submits.set(form, submit);
				const block = (event: Event) => event.preventDefault();
				form.addEventListener('submit', block);
				return {
					destroy: () => {
						submits.delete(form);
						form.removeEventListener('submit', block);
					}
				};
			}),
			applyAction: vi.fn(async () => {})
		}
	};
});
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/forms', () => ({ enhance: forms.enhance, applyAction: forms.applyAction }));

function customer(overrides: Partial<AdminBillingCustomer>): AdminBillingCustomer {
	return {
		userId: 'user-x',
		email: null,
		fullName: null,
		billingMode: 'stripe',
		deviceCount: 0,
		licensedDeviceCount: 0,
		seatCount: 0,
		manualSeatCount: 0,
		stripeCustomerId: null,
		deviceSubscriptionId: null,
		deviceSeats: 0,
		reportingStatus: null,
		reportingManual: false,
		...overrides
	};
}

const ADA = customer({
	userId: 'user-a',
	email: 'ada@example.com',
	fullName: 'Ada Lovelace',
	deviceCount: 4,
	licensedDeviceCount: 3,
	seatCount: 3,
	stripeCustomerId: 'cus_1',
	deviceSubscriptionId: 'sub_1234567890abcdef',
	deviceSeats: 3,
	reportingStatus: 'active'
});
const BOB = customer({
	userId: 'user-b',
	fullName: 'Bob Builder',
	billingMode: 'manual',
	deviceCount: 10,
	licensedDeviceCount: 10,
	seatCount: 12,
	manualSeatCount: 2,
	reportingManual: true
});
const CAROL = customer({
	userId: 'user-c',
	deviceCount: 2,
	reportingStatus: 'canceled'
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(customers: AdminBillingCustomer[] = [ADA, BOB, CAROL], loadFailed = false) {
	view = renderWithServices(AdminBillingPage, {
		props: { data: { customers, loadFailed } } as never,
		app: { accessToken: 'jwt-token' }
	});
	flushSync();
	return view;
}

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	forms.applyAction.mockClear();
});

const rows = () => [
	...document.querySelectorAll<HTMLTableRowElement>('#admin-billing-table tr.cw-data-table__row')
];
const cells = (row: HTMLTableRowElement) =>
	[...row.querySelectorAll('td:not(.cw-data-table__td--actions)')].map((td) =>
		td.textContent?.trim()
	);
const firstCells = () => rows().map((row) => cells(row)[0]);
const byId = <E extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as E | null;
const chipTones = (row: HTMLTableRowElement) =>
	[...row.querySelectorAll('.cw-chip')].map((chip) =>
		['info', 'secondary', 'success'].find((tone) => chip.classList.contains(`cw-chip--${tone}`))
	);
const sortBy = (header: string) => {
	[...document.querySelectorAll<HTMLButtonElement>('button.cw-data-table__sort-btn')]
		.find((button) => button.textContent?.includes(header))
		?.click();
	flushSync();
};

/**
 * Runs the enhance callback of the form holding `buttonId` as SvelteKit
 * would: the submit function first (the row turns busy), then the result handler.
 */
async function submit(buttonId: string, result?: ActionResult) {
	const form = byId(buttonId)?.closest('form');
	const submitFn = form && forms.submits.get(form);
	if (!form || !submitFn) throw new Error(`No enhanced form around #${buttonId}`);
	const url = new URL(`http://localhost/admin/billing${form.getAttribute('action')}`);
	const formData = new FormData(form);
	const update = vi.fn(async () => {});
	const after = await submitFn({
		action: url,
		formData,
		formElement: form,
		controller: new AbortController(),
		submitter: null,
		cancel: vi.fn()
	});
	flushSync();
	const finish = async (outcome: ActionResult) => {
		if (typeof after === 'function') {
			await after({ action: url, formData, formElement: form, result: outcome, update });
		}
		flushSync();
	};
	if (result) await finish(result);
	return { form, formData, update, finish };
}

describe('admin billing page: table', () => {
	it('lists every customer with their devices, seats, billing mode and reporting', async () => {
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(3));
		expect(document.title).toBe(`${m.admin_billing_title()} - CropWatch`);
		expect(rows().map(cells)).toEqual([
			[
				'ada@example.com',
				'4',
				'3',
				'3',
				m.admin_billing_mode_stripe(),
				`sub_12345678… · 3`,
				'active'
			],
			[
				'Bob Builder',
				'10',
				'10',
				'12 (2)',
				m.admin_billing_mode_manual(),
				CW_EMPTY_VALUE,
				m.admin_billing_mode_manual()
			],
			['user-c', '2', '0', '0', m.admin_billing_mode_stripe(), CW_EMPTY_VALUE, 'canceled']
		]);
		expect(rows().map(chipTones)).toEqual([
			['secondary', 'success'],
			['info', 'success'],
			['secondary', 'secondary']
		]);
		expect(document.body.textContent).not.toContain(m.billing_load_error());
	});

	it('shows a dash for reporting without a status', async () => {
		render([customer({ userId: 'user-d' })]);

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0]).at(-1)).toBe(CW_EMPTY_VALUE);
	});

	it('says when the customers could not be loaded', async () => {
		render([], true);

		expect(document.querySelector('.app-notice--danger')?.textContent).toContain(
			m.billing_load_error()
		);
	});

	it('searches by email, name or user id, ignoring case', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));
		const search = document.querySelector<HTMLInputElement>(
			'.cw-data-table__search-wrapper input'
		)!;
		const searchFor = (value: string) => {
			search.value = value;
			search.dispatchEvent(new Event('input', { bubbles: true }));
		};

		searchFor('  ADA@ ');
		await vi.waitFor(() => expect(firstCells()).toEqual(['ada@example.com']));
		searchFor('lovelace');
		await vi.waitFor(() => expect(firstCells()).toEqual(['ada@example.com']));
		searchFor('USER-C');
		await vi.waitFor(() => expect(firstCells()).toEqual(['user-c']));
		searchFor('builder');
		await vi.waitFor(() => expect(firstCells()).toEqual(['Bob Builder']));
		searchFor('');
		await vi.waitFor(() => expect(rows()).toHaveLength(3));
	});

	it('sorts device counts as numbers and customers as text', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));

		sortBy(m.admin_billing_col_devices());
		await vi.waitFor(() =>
			expect(firstCells()).toEqual(['user-c', 'ada@example.com', 'Bob Builder'])
		);
		sortBy(m.admin_billing_col_devices());
		await vi.waitFor(() =>
			expect(firstCells()).toEqual(['Bob Builder', 'ada@example.com', 'user-c'])
		);

		sortBy(m.admin_billing_col_customer());
		await vi.waitFor(() =>
			expect(firstCells()).toEqual(['ada@example.com', 'Bob Builder', 'user-c'])
		);
	});

	it('pages through the customers 25 at a time', async () => {
		render(
			Array.from({ length: 30 }, (_, index) =>
				customer({ userId: `user-${String(index + 1).padStart(2, '0')}` })
			)
		);

		await vi.waitFor(() => expect(rows()).toHaveLength(25));
		document
			.querySelector<HTMLButtonElement>(`button[aria-label="${m.cwui_table_next_page()}"]`)
			?.click();

		await vi.waitFor(() => expect(rows()).toHaveLength(5));
		expect(firstCells()).toEqual(['user-26', 'user-27', 'user-28', 'user-29', 'user-30']);
	});

	it('goes back to the dashboard', () => {
		render();

		byId('admin-billing-back-button')?.click();

		expect(goto).toHaveBeenCalledWith('/');
	});
});

describe('admin billing page: row actions', () => {
	it('offers the opposite billing mode, manual seats for manual customers, and reporting', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));

		expect(byId('admin-billing-user-a-mode-button')?.textContent?.trim()).toBe(
			m.admin_billing_set_mode_manual()
		);
		expect(byId('admin-billing-user-b-mode-button')?.textContent?.trim()).toBe(
			m.admin_billing_set_mode_stripe()
		);
		expect(byId('admin-billing-user-a-seats-input')).toBeNull();
		expect(byId<HTMLInputElement>('admin-billing-user-b-seats-input')?.value).toBe('2');
		expect(byId('admin-billing-user-a-reporting-button')?.textContent?.trim()).toBe(
			m.admin_billing_grant_reporting()
		);
		expect(byId('admin-billing-user-a-reporting-button')?.classList).toContain(
			'cw-button--secondary'
		);
		expect(byId('admin-billing-user-b-reporting-button')?.textContent?.trim()).toBe(
			m.admin_billing_revoke_reporting()
		);
		expect(byId('admin-billing-user-b-reporting-button')?.classList).toContain('cw-button--ghost');
	});

	it('posts the switch to the other billing mode', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));

		const toManual = await submit('admin-billing-user-a-mode-button');
		const toStripe = await submit('admin-billing-user-b-mode-button');

		expect(toManual.form.getAttribute('action')).toBe('?/setBillingMode');
		expect(Object.fromEntries(toManual.formData)).toEqual({
			userId: 'user-a',
			billingMode: 'manual'
		});
		expect(Object.fromEntries(toStripe.formData)).toEqual({
			userId: 'user-b',
			billingMode: 'stripe'
		});
	});

	it('posts the typed manual seat count', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));
		const seats = byId<HTMLInputElement>('admin-billing-user-b-seats-input')!;
		seats.value = '7';
		seats.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		const { form, formData } = await submit('admin-billing-user-b-seats-button');

		expect(form.getAttribute('action')).toBe('?/setManualSeats');
		expect(Object.fromEntries(formData)).toEqual({ userId: 'user-b', seats: '7' });
		expect(seats.value).toBe('7');
	});

	it('posts granting or revoking manual reporting', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));

		const grant = await submit('admin-billing-user-a-reporting-button');
		const revoke = await submit('admin-billing-user-b-reporting-button');

		expect(grant.form.getAttribute('action')).toBe('?/setReporting');
		expect(Object.fromEntries(grant.formData)).toEqual({ userId: 'user-a', manual: 'true' });
		expect(Object.fromEntries(revoke.formData)).toEqual({ userId: 'user-b', manual: 'false' });
	});

	it('locks every row while one updates, then confirms and refreshes in place', async () => {
		const { toasts } = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));

		const { update, finish } = await submit('admin-billing-user-a-mode-button');

		expect(byId('admin-billing-user-a-mode-button')?.getAttribute('aria-busy')).toBe('true');
		expect(byId('admin-billing-user-a-reporting-button')?.getAttribute('aria-busy')).toBe('true');
		expect(byId('admin-billing-user-b-mode-button')?.getAttribute('aria-busy')).toBeNull();
		expect(byId('admin-billing-user-b-mode-button')?.disabled).toBe(true);
		expect(byId('admin-billing-user-b-seats-button')?.disabled).toBe(true);

		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(byId('admin-billing-user-a-mode-button')?.getAttribute('aria-busy')).toBeNull();
		expect(byId('admin-billing-user-b-mode-button')?.disabled).toBe(false);
		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(toasts()).toMatchObject([{ tone: 'success', message: m.admin_billing_updated_toast() }]);
		expect(forms.applyAction).not.toHaveBeenCalled();
	});

	it("shows the action's error, and stays quiet for other results", async () => {
		const { toasts } = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(3));
		const failure: ActionResult = {
			type: 'failure',
			status: 400,
			data: { error: m.admin_billing_seats_invalid() }
		};

		const first = await submit('admin-billing-user-b-seats-button', failure);
		await submit('admin-billing-user-b-seats-button', { type: 'failure', status: 403 });
		await submit('admin-billing-user-b-seats-button', {
			type: 'error',
			status: 500,
			error: new Error('boom')
		});

		expect(forms.applyAction).toHaveBeenCalledTimes(3);
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(first.update).not.toHaveBeenCalled();
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.admin_billing_seats_invalid() }]);
		expect(byId('admin-billing-user-b-seats-button')?.disabled).toBe(false);
	});
});
