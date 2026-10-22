import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	BillingEntitlements,
	DeviceDto,
	ReportFormContextDto,
	ReportTemplateDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import EditReportPage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const TEMPLATE: ReportTemplateDto = {
	id: 7,
	name: 'Weekly cold room',
	description: null,
	deviceTypeId: 5,
	dataPullInterval: 30,
	isActive: true,
	createdAt: null,
	assignments: [
		{
			id: 1,
			devEui: 'DEV-A',
			templateId: 7,
			isActive: true,
			createdAt: null,
			deviceName: 'Freezer A',
			locationName: null,
			permissionLevel: 1
		}
	],
	schedule: [],
	recipients: [
		{
			id: 2,
			templateId: 7,
			communicationMethod: 1,
			email: 'ops@example.com',
			name: null,
			createdAt: null
		}
	],
	alertPoints: [],
	dataProcessingSchedules: []
};

function context(template: ReportTemplateDto | null = TEMPLATE): ReportFormContextDto {
	return {
		devices: [{ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10, type: 5 } as DeviceDto],
		locations: [],
		communicationMethods: [],
		template
	};
}

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
	view = renderWithServices(EditReportPage, {
		props: {
			data: { context: context(), entitlements: entitlements(), authToken: 'jwt-token', ...data }
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

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('edit report page', () => {
	it('shows the saved template in the form', () => {
		render();

		expect(document.title).toBe(m.reports_new_edit_page_title());
		expect(view!.target.querySelector('h1')?.textContent).toBe(m.reports_new_edit_template());
		expect(view!.target.textContent).toContain(`${m.reports_new_template_id()}: 7`);
		expect(byId<HTMLInputElement>('report-form-name-input')?.value).toBe('Weekly cold room');
		expect(submitButton().textContent?.trim()).toBe(m.action_save_changes());
		expect(submitButton().disabled).toBe(false);
		expect(view!.target.textContent).not.toContain(m.reports_upsell_title());
	});

	it('shows template id 0 when the context has no template', () => {
		render({ context: context(null) });

		expect(view!.target.textContent).toContain(`${m.reports_new_template_id()}: 0`);
	});

	it('saves the template through the report service', async () => {
		services.reports.updateReportTemplate.mockResolvedValue(TEMPLATE);
		render();

		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/reports'));
		expect(services.reports.updateReportTemplate).toHaveBeenCalledWith(
			7,
			expect.objectContaining({ name: 'Weekly cold room', devEuis: ['DEV-A'] })
		);
	});

	it('blocks saving and offers the subscription without the reporting entitlement', () => {
		render({ entitlements: entitlements({ reporting: false }) });

		expect(view!.target.textContent).toContain(m.reports_upsell_title());
		expect(submitButton().disabled).toBe(true);
	});

	it.each([
		['for staff', entitlements({ reporting: false, isStaff: true })],
		['when the entitlements are unknown (fails open)', null]
	])('lets the template be saved %s', (_label, value) => {
		render({ entitlements: value });

		expect(submitButton().disabled).toBe(false);
	});

	it('goes back to the reports list', () => {
		render();

		click(byId('report-edit-back-button'));

		expect(goto).toHaveBeenCalledWith('/reports');
		expect(byId('report-edit-back-button')?.textContent).toContain(m.action_back());
	});
});
