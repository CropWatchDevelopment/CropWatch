import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingEntitlements, DeviceDto, ReportFormContextDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import CreateReportPage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const CONTEXT: ReportFormContextDto = {
	devices: [{ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10, type: 5 } as DeviceDto],
	locations: [],
	communicationMethods: [],
	template: null
};

const entitlements = (overrides: Partial<BillingEntitlements> = {}): BillingEntitlements => ({
	billingMode: 'stripe',
	isStaff: false,
	seats: 1,
	reporting: true,
	...overrides
});

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: Record<string, unknown> = {}) {
	view = renderWithServices(CreateReportPage, {
		props: {
			data: {
				context: CONTEXT,
				entitlements: entitlements(),
				authToken: 'jwt-token',
				devEui: null,
				currentUserEmail: null,
				currentUserName: null,
				...data
			}
		} as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const submitButton = () => byId<HTMLButtonElement>('report-form-submit-button')!;

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('create report page', () => {
	it('shows the report form for a new template', () => {
		render();

		expect(document.title).toBe(m.reports_new_create_page_title());
		expect(view!.target.querySelector('h1')?.textContent).toBe(m.reports_new_create_template());
		expect(submitButton().textContent?.trim()).toBe(m.reports_new_create_template());
		expect(view!.target.textContent).not.toContain(m.reports_upsell_title());
	});

	it('goes back to the reports list', () => {
		render();

		click(byId('report-create-back-button'));

		expect(goto).toHaveBeenCalledWith('/reports');
		expect(byId('report-create-back-button')?.textContent).toContain(m.action_back());
	});

	it('preselects the device it was opened for and sends the report to the current user', () => {
		render({ devEui: 'DEV-A', currentUserEmail: 'ada@example.com', currentUserName: 'Ada' });

		expect(
			byId('report-form-devices-multiselect')
				?.closest('.cw-multiselect')
				?.querySelector('.cw-multiselect__chip-label')?.textContent
		).toBe('Freezer A (DEV-A)');
		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe(
			'ada@example.com'
		);
		expect(byId<HTMLInputElement>('report-recipients-0-name-input')?.value).toBe('Ada');
	});

	it('creates the template through the report service', async () => {
		services.reports.createReportTemplate.mockResolvedValue({ id: 1 } as never);
		render({ devEui: 'DEV-A', currentUserEmail: 'ada@example.com' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/reports'));
		expect(services.reports.createReportTemplate).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Weekly cold room', devEuis: ['DEV-A'] })
		);
	});

	it('blocks saving and offers the subscription without the reporting entitlement', () => {
		render({
			devEui: 'DEV-A',
			currentUserEmail: 'ada@example.com',
			entitlements: entitlements({ reporting: false })
		});

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		expect(view!.target.textContent).toContain(m.reports_upsell_title());
		expect(submitButton().disabled).toBe(true);
	});

	it.each([
		['for staff', entitlements({ reporting: false, isStaff: true })],
		['when the entitlements are unknown (fails open)', null]
	])('lets the template be saved %s', (_label, value) => {
		render({ devEui: 'DEV-A', currentUserEmail: 'ada@example.com', entitlements: value });

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		expect(view!.target.textContent).not.toContain(m.reports_upsell_title());
		expect(submitButton().disabled).toBe(false);
	});
});
