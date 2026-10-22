import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type {
	CommunicationMethodDto,
	DeviceDto,
	LocationDto,
	ReportFormContextDto,
	ReportTemplateDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ReportTemplateForm from './ReportTemplateForm.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const device = (overrides: Partial<DeviceDto>) =>
	({ name: undefined, location_id: 10, type: 5, ...overrides }) as DeviceDto;
const location = (locationId: number, name: unknown) =>
	({ location_id: locationId, name, created_at: '' }) as LocationDto;
const method = (overrides: Partial<CommunicationMethodDto>): CommunicationMethodDto => ({
	communicationMethodId: 1,
	name: 'Email',
	isActive: true,
	...overrides
});

function context(overrides: Partial<ReportFormContextDto> = {}): ReportFormContextDto {
	return {
		devices: [
			device({ dev_eui: 'DEV-A', name: 'Freezer A' }),
			device({ dev_eui: 'DEV-B', name: 'Freezer B' }),
			device({ dev_eui: 'DEV-C', name: undefined, type: 6 })
		],
		locations: [location(10, 'North barn')],
		communicationMethods: [],
		template: null,
		...overrides
	};
}

function template(overrides: Partial<ReportTemplateDto> = {}): ReportTemplateDto {
	return {
		id: 7,
		name: 'Weekly cold room',
		description: null,
		deviceTypeId: 5,
		dataPullInterval: 120,
		isActive: false,
		createdAt: null,
		assignments: [
			{
				id: 1,
				devEui: 'DEV-A',
				templateId: 7,
				isActive: true,
				createdAt: null,
				deviceName: 'Freezer A',
				locationName: 'North barn',
				permissionLevel: 1
			}
		],
		schedule: [
			{
				id: 3,
				templateId: 7,
				endOfDay: false,
				endOfWeek: true,
				endOfMonth: true,
				utcOffset: 9,
				isActive: true,
				createdAt: null
			}
		],
		recipients: [
			{
				id: 4,
				templateId: 7,
				communicationMethod: 2,
				email: 'night@example.com',
				name: 'Night shift',
				createdAt: null
			}
		],
		alertPoints: [
			{
				id: 5,
				templateId: 7,
				name: 'Too warm',
				dataPointKey: 'temperature_c',
				operator: '>',
				min: null,
				max: null,
				value: 8,
				hexColor: '#ff0000',
				createdAt: null
			}
		],
		dataProcessingSchedules: [
			{
				id: 'dps-uuid',
				templateId: 7,
				dayOfWeek: 2,
				startTime: '08:00',
				endTime: '18:00',
				crossesMidnight: false,
				ruleType: 'include',
				validFrom: null,
				validTo: null,
				timezone: 'Asia/Tokyo',
				isEnabled: true,
				createdAt: null,
				updatedAt: null
			}
		],
		...overrides
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		mode: 'create' | 'edit';
		context: ReportFormContextDto;
		preselectedDevEui: string | null;
		currentUserEmail: string | null;
		currentUserName: string | null;
		disabled: boolean;
	}> = {}
) {
	view = renderWithServices(ReportTemplateForm, {
		props: { mode: 'create', context: context(), ...props },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => view?.target.textContent ?? '';
const submitButton = () => byId<HTMLButtonElement>('report-form-submit-button')!;
const validationNotice = () =>
	[...view!.target.querySelectorAll('.app-notice--warning')].find((notice) =>
		notice.textContent?.includes(m.reports_create_validation_title())
	) ?? null;
const validationIssues = () =>
	[...(validationNotice()?.querySelectorAll('li') ?? [])].map((item) => item.textContent);

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Opens a cwui dropdown / multiselect by its trigger id and returns its option labels. */
function optionsOf(triggerId: string): string[] {
	const trigger = byId(triggerId)!;
	const root = trigger.closest('.cw-dropdown, .cw-multiselect')!;
	if (trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
	return [...root.querySelectorAll('li[role="option"]')].map(
		(option) => option.textContent?.trim() ?? ''
	);
}

/** Opens a cwui dropdown / multiselect by its trigger id and clicks the option labelled `label`. */
function choose(triggerId: string, label: string) {
	const trigger = byId(triggerId)!;
	const root = trigger.closest('.cw-dropdown, .cw-multiselect')!;
	if (trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
	const option = [...root.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}" in ${triggerId}`);
	click(option);
}

const chips = (triggerId: string) =>
	[
		...(byId(triggerId)
			?.closest('.cw-multiselect')
			?.querySelectorAll('.cw-multiselect__chip-label') ?? [])
	].map((chip) => chip.textContent);

/** The payload of the one save request. */
const createPayload = () => services.reports.createReportTemplate.mock.calls[0][0];

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('ReportTemplateForm — a new template', () => {
	it('renders every section, with a ready-to-use default', () => {
		render({ currentUserEmail: 'ops@example.com', currentUserName: 'Ops' });

		expect(text()).toContain(m.reports_new_step_template());
		expect(text()).toContain(m.reports_new_step_template_subtitle());
		expect(text()).toContain(m.reports_new_step_assignments());
		expect(text()).toContain(m.reports_new_step_assignments_subtitle());
		expect(text()).toContain(m.reports_create_schedules_title());
		expect(text()).toContain(m.reports_schedule_card_title());
		expect(text()).toContain(m.reports_create_alerts_title());
		expect(text()).toContain(m.reports_create_alerts_copy());
		expect(text()).toContain(m.reports_create_alert_points_empty_title());
		expect(text()).toContain(m.reports_create_recipients_title());
		expect(byId<HTMLInputElement>('report-form-name-input')?.value).toBe('');
		expect(byId<HTMLTextAreaElement>('report-form-description-textarea')?.value).toBe('');
		expect(byId('report-form-data-pull-interval-select')?.textContent?.trim()).toBe(
			m.reports_data_pull_interval_minutes_other({ count: 30 })
		);
		expect(byId<HTMLInputElement>('report-form-active-switch')?.checked).toBe(true);
		expect(byId('report-form-devices-multiselect')).not.toBeNull();
		expect(byId<HTMLInputElement>('report-cadence-week-switch')?.checked).toBe(true);
		// The report goes to the person creating it.
		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe(
			'ops@example.com'
		);
		expect(byId<HTMLInputElement>('report-recipients-0-name-input')?.value).toBe('Ops');
		expect(byId('report-recipients-1-email-input')).toBeNull();
		expect(submitButton().textContent?.trim()).toBe(m.reports_new_create_template());
		expect(byId('report-form-cancel-button')?.textContent?.trim()).toBe(m.action_cancel());
		expect(validationNotice()).toBeNull();
	});

	it('starts with a blank recipient without a signed-in user', () => {
		render();

		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe('');
		expect(byId<HTMLInputElement>('report-recipients-0-name-input')?.value).toBe('');
	});

	it('cannot be saved until it has a name and a device', () => {
		render({ currentUserEmail: 'ops@example.com' });
		expect(submitButton().disabled).toBe(true);

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');
		expect(submitButton().disabled).toBe(true);

		choose('report-form-devices-multiselect', 'Freezer A (DEV-A)');
		expect(submitButton().disabled).toBe(false);
	});

	it('does not report a failed navigation after a successful save as a failed save', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		const navigationError = new Error('Navigation aborted');
		goto.mockRejectedValueOnce(navigationError);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		render({
			preselectedDevEui: 'DEV-A',
			currentUserEmail: 'ops@example.com',
			currentUserName: 'Ops'
		});

		try {
			type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');
			click(submitButton());

			await vi.waitFor(() =>
				expect(consoleError).toHaveBeenCalledWith(
					'Failed to open the reports list after saving:',
					navigationError
				)
			);
			expect(view!.toasts().map((toast) => toast.tone)).toEqual(['success']);
			expect(submitButton().disabled).toBe(false);
		} finally {
			consoleError.mockRestore();
		}
	});

	it('creates the template and returns to the reports list', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({
			preselectedDevEui: 'DEV-A',
			currentUserEmail: 'ops@example.com',
			currentUserName: 'Ops'
		});

		type(byId<HTMLInputElement>('report-form-name-input')!, '  Weekly cold room ');
		type(byId<HTMLTextAreaElement>('report-form-description-textarea')!, 'Every Monday');
		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/reports'));
		expect(services.reports.createReportTemplate).toHaveBeenCalledTimes(1);
		expect(createPayload()).toEqual({
			name: 'Weekly cold room',
			description: 'Every Monday',
			isActive: true,
			deviceTypeId: 5,
			devEuis: ['DEV-A'],
			schedule: [
				{ endOfDay: false, endOfWeek: true, endOfMonth: false, utcOffset: 0, isActive: true }
			],
			recipients: [{ communicationMethod: 1, email: 'ops@example.com', name: 'Ops' }],
			alertPoints: [],
			dataProcessingSchedules: [],
			dataPullInterval: 30
		});
		expect(services.reports.updateReportTemplate).not.toHaveBeenCalled();
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.reports_new_created_success({ name: 'Weekly cold room' }),
			duration: 4000,
			dismissible: true
		});
	});

	it('saves every setting the user changes', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com' });

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Monthly');
		choose('report-form-data-pull-interval-select', m.reports_data_pull_interval_hours_one());
		click(byId('report-form-active-switch'));
		click(byId('report-cadence-week-switch'));
		click(byId('report-cadence-month-switch'));
		type(byId<HTMLInputElement>('report-cadence-utc-offset-input')!, '9');
		choose('report-recipients-0-method-select', m.reports_create_method_sms());
		click(
			[...view!.target.querySelectorAll('.cw-alert-points button')].find((button) =>
				button.textContent?.includes(m.reports_create_add_alert())
			)
		);
		click(submitButton());

		await vi.waitFor(() => expect(services.reports.createReportTemplate).toHaveBeenCalled());
		expect(createPayload()).toMatchObject({
			name: 'Monthly',
			isActive: false,
			dataPullInterval: 60,
			schedule: [
				{ endOfDay: false, endOfWeek: false, endOfMonth: true, utcOffset: 9, isActive: true }
			],
			recipients: [{ communicationMethod: 2, email: 'ops@example.com' }],
			alertPoints: [
				{
					dataPointKey: 'temperature_c',
					name: m.reports_create_alert_heading({ index: '1' }),
					hexColor: '#3987E5',
					operator: '=',
					value: 0
				}
			]
		});
	});

	it('sends the device type only when every chosen device has the same one', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({ currentUserEmail: 'ops@example.com' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Freezers');
		choose('report-form-devices-multiselect', 'Freezer A (DEV-A)');
		choose('report-form-devices-multiselect', 'Freezer B (DEV-B)');

		click(submitButton());
		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		expect(createPayload()).toMatchObject({ devEuis: ['DEV-A', 'DEV-B'], deviceTypeId: 5 });
		await vi.waitFor(() => expect(submitButton().disabled).toBe(false));

		choose('report-form-devices-multiselect', 'DEV-C');
		click(submitButton());
		await vi.waitFor(() => expect(services.reports.createReportTemplate).toHaveBeenCalledTimes(2));
		expect(services.reports.createReportTemplate.mock.calls[1][0]).toMatchObject({
			devEuis: ['DEV-A', 'DEV-B', 'DEV-C'],
			deviceTypeId: null
		});
	});

	it('has no device type for devices it does not know', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({
			preselectedDevEui: 'DEV-X',
			currentUserEmail: 'ops@example.com',
			context: context({
				devices: [device({ dev_eui: 'DEV-Y', type: null as never })]
			})
		});
		choose('report-form-devices-multiselect', 'DEV-Y');
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Unknown types');

		click(submitButton());

		await vi.waitFor(() => expect(services.reports.createReportTemplate).toHaveBeenCalled());
		expect(createPayload()).toMatchObject({ devEuis: ['DEV-X', 'DEV-Y'], deviceTypeId: null });
	});

	it('shows the save in progress, then the API error when it fails', async () => {
		let failSave!: (reason: unknown) => void;
		services.reports.createReportTemplate.mockReturnValue(
			new Promise((_resolve, reject) => (failSave = reject))
		);
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		click(submitButton());

		expect(submitButton().textContent?.trim()).toBe(m.action_saving());
		expect(submitButton().disabled).toBe(true);
		expect(byId<HTMLButtonElement>('report-form-cancel-button')?.disabled).toBe(true);

		failSave({ message: 'Name already used' });

		await vi.waitFor(() =>
			expect(view!.toasts()[0]).toMatchObject({
				tone: 'danger',
				message: 'Name already used',
				duration: 5000,
				dismissible: true
			})
		);
		expect(submitButton().textContent?.trim()).toBe(m.reports_new_create_template());
		expect(submitButton().disabled).toBe(false);
		expect(goto).not.toHaveBeenCalled();
	});

	it('falls back to the generic message when the failure has none', async () => {
		services.reports.createReportTemplate.mockRejectedValue({});
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		click(submitButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.reports_new_save_failed()));
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic message for %s', async (_label, failure) => {
		services.reports.createReportTemplate.mockRejectedValue(failure);
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		click(submitButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.reports_new_save_failed()));
	});

	it('says why it cannot be saved as soon as the user edits it', () => {
		render({ currentUserEmail: 'ops@example.com' });
		// An untouched new form does not open with a list of all it still needs.
		expect(validationNotice()).toBeNull();
		expect(submitButton().disabled).toBe(true);

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		const notice = validationNotice()!;
		expect(notice.getAttribute('aria-live')).toBe('polite');
		expect(notice.textContent).toContain(m.reports_create_validation_copy());
		expect(validationIssues()).toEqual([m.reports_new_validation_devices_required()]);
		expect(submitButton().disabled).toBe(true);

		choose('report-form-devices-multiselect', 'Freezer A (DEV-A)');
		expect(validationNotice()).toBeNull();
		expect(submitButton().disabled).toBe(false);

		// Once edited, the form keeps explaining a disabled Save.
		type(byId<HTMLInputElement>('report-form-name-input')!, '  ');
		type(byId<HTMLInputElement>('report-recipients-0-email-input')!, 'not-an-email');
		expect(validationIssues()).toEqual([
			m.reports_create_validation_report_name_required(),
			m.reports_create_validation_recipient_email({ index: '1' })
		]);
		expect(submitButton().disabled).toBe(true);
	});

	it('cannot be saved while saving is blocked', () => {
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com', disabled: true });

		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');

		expect(submitButton().disabled).toBe(true);
	});

	it('goes back to the reports list on cancel', () => {
		render();

		click(byId('report-form-cancel-button'));

		expect(goto).toHaveBeenCalledWith('/reports');
		expect(services.reports.createReportTemplate).not.toHaveBeenCalled();
	});
});

describe('ReportTemplateForm — devices', () => {
	it('says when there are no devices to assign', () => {
		render({ context: context({ devices: [] }) });

		expect(text()).toContain(m.reports_create_no_devices_loaded());
		expect(byId('report-form-devices-multiselect')).toBeNull();
	});

	it('copes with a form context without device or method lists', () => {
		render({
			context: context({ devices: undefined as never, communicationMethods: undefined as never })
		});

		expect(text()).toContain(m.reports_create_no_devices_loaded());
		expect(optionsOf('report-recipients-0-method-select')).toEqual([
			m.reports_create_method_email(),
			m.reports_create_method_sms()
		]);
	});

	it('offers the devices by name, grouped by location', () => {
		render({
			context: context({
				devices: [
					device({ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10 }),
					device({ dev_eui: 'DEV-B', name: 'Freezer B', location_id: 20 }),
					device({ dev_eui: 'DEV-C', name: undefined, location_id: 30 }),
					device({ dev_eui: 'DEV-D', name: 'Freezer D', location_id: 10 }),
					// No location: offered, but in no group.
					device({ dev_eui: 'DEV-E', name: 'Loose', location_id: null as never })
				],
				locations: [location(10, ' North barn '), location(20, '   ')]
			})
		});

		expect(optionsOf('report-form-devices-multiselect')).toEqual(
			expect.arrayContaining([
				'Freezer A (DEV-A)',
				'Freezer B (DEV-B)',
				'DEV-C',
				'Freezer D (DEV-D)',
				'Loose (DEV-E)'
			])
		);
		const groups = [
			...byId('report-form-devices-multiselect')!
				.closest('.cw-multiselect')!
				.querySelectorAll('.cw-multiselect__group-header-label')
		].map((label) => label.textContent?.trim());
		// A location without a usable name is named by its id.
		expect(groups).toEqual(
			[
				'North barn',
				m.locations_location_with_id({ id: '20' }),
				m.locations_location_with_id({ id: '30' })
			].sort((a, b) => a.localeCompare(b))
		);
	});

	it('preselects the device it was opened for', () => {
		render({ preselectedDevEui: 'DEV-A' });

		expect(chips('report-form-devices-multiselect')).toEqual(['Freezer A (DEV-A)']);
	});

	it('keeps a preselected device that is not in the device list', () => {
		render({ preselectedDevEui: 'DEV-GONE', context: context({ devices: [] }) });

		expect(text()).not.toContain(m.reports_create_no_devices_loaded());
		expect(chips('report-form-devices-multiselect')).toEqual(['DEV-GONE']);
		expect(optionsOf('report-form-devices-multiselect')).toEqual(['DEV-GONE']);
	});
});

describe('ReportTemplateForm — recipients and processing schedules', () => {
	it('offers the active communication methods the API knows', () => {
		render({
			context: context({
				communicationMethods: [
					method({ communicationMethodId: 1, name: 'Email' }),
					method({ communicationMethodId: 3, name: 'LINE' }),
					method({ communicationMethodId: 2, name: 'SMS', isActive: false }),
					method({ communicationMethodId: 4, name: null })
				]
			})
		});

		expect(optionsOf('report-recipients-0-method-select')).toEqual(['Email', 'LINE']);
	});

	it('falls back to email and SMS when the API knows no usable method', () => {
		render({
			context: context({ communicationMethods: [method({ isActive: false })] })
		});

		expect(optionsOf('report-recipients-0-method-select')).toEqual([
			m.reports_create_method_email(),
			m.reports_create_method_sms()
		]);
	});

	it('adds and removes recipients', () => {
		render({ currentUserEmail: 'ops@example.com' });
		expect(byId('report-recipients-0-remove-button')).toBeNull();

		click(byId('report-recipients-add-button'));

		expect(text()).toContain(m.reports_create_recipient_heading({ index: '2' }));
		expect(byId<HTMLInputElement>('report-recipients-1-email-input')?.value).toBe('');
		expect(byId('report-recipients-0-method-select')?.textContent?.trim()).toBe(
			m.reports_create_method_email()
		);

		click(byId('report-recipients-0-remove-button'));

		expect(text()).not.toContain(m.reports_create_recipient_heading({ index: '2' }));
		// The new, empty recipient is the one left.
		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe('');
		expect(byId('report-recipients-0-remove-button')).toBeNull();
	});

	it('adds and removes processing schedules', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({ preselectedDevEui: 'DEV-A', currentUserEmail: 'ops@example.com' });
		click(view!.target.querySelector('.cw-expand__header'));
		expect(text()).toContain(m.reports_schedule_empty());

		click(byId('report-schedules-add-button'));
		click(byId('report-schedules-add-button'));

		expect(text()).toContain(m.reports_schedule_entry_heading({ index: '2' }));
		expect(optionsOf('report-schedules-0-day-select')).toEqual([
			m.common_day_sunday(),
			m.common_day_monday(),
			m.common_day_tuesday(),
			m.common_day_wednesday(),
			m.common_day_thursday(),
			m.common_day_friday(),
			m.common_day_saturday()
		]);
		expect(optionsOf('report-schedules-0-rule-type-select')).toEqual([
			m.reports_schedule_rule_type_include(),
			m.reports_schedule_rule_type_exclude()
		]);
		choose('report-schedules-1-day-select', m.common_day_friday());

		click(byId('report-schedules-0-remove-button'));

		expect(text()).not.toContain(m.reports_schedule_entry_heading({ index: '2' }));
		type(byId<HTMLInputElement>('report-form-name-input')!, 'With a schedule');
		click(submitButton());
		await vi.waitFor(() => expect(services.reports.createReportTemplate).toHaveBeenCalled());
		expect(createPayload().dataProcessingSchedules).toEqual([
			{
				dayOfWeek: 5,
				startTime: '09:00',
				endTime: '17:00',
				crossesMidnight: false,
				isEnabled: true,
				ruleType: 'include',
				timezone: 'UTC'
			}
		]);
	});
});

describe('ReportTemplateForm — editing a template', () => {
	it('shows the saved template', () => {
		render({ mode: 'edit', context: context({ template: template() }) });

		expect(byId<HTMLInputElement>('report-form-name-input')?.value).toBe('Weekly cold room');
		expect(byId<HTMLTextAreaElement>('report-form-description-textarea')?.value).toBe('');
		// A saved interval the form does not offer is still shown.
		expect(byId('report-form-data-pull-interval-select')?.textContent?.trim()).toBe(
			m.reports_data_pull_interval_hours_other({ count: 2 })
		);
		expect(optionsOf('report-form-data-pull-interval-select')).toEqual([
			m.reports_data_pull_interval_hours_other({ count: 2 }),
			m.reports_data_pull_interval_minutes_other({ count: 30 }),
			m.reports_data_pull_interval_hours_one()
		]);
		expect(byId<HTMLInputElement>('report-form-active-switch')?.checked).toBe(false);
		expect(chips('report-form-devices-multiselect')).toEqual(['Freezer A (DEV-A)']);
		expect(byId<HTMLInputElement>('report-cadence-week-switch')?.checked).toBe(true);
		expect(byId<HTMLInputElement>('report-cadence-month-switch')?.checked).toBe(true);
		expect(byId<HTMLInputElement>('report-cadence-utc-offset-input')?.value).toBe('9');
		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe(
			'night@example.com'
		);
		expect(byId('report-recipients-0-method-select')?.textContent?.trim()).toBe(
			m.reports_create_method_sms()
		);
		expect(byId('report-schedules-0-day-select')?.textContent?.trim()).toBe(m.common_day_tuesday());
		expect(text()).toContain('Too warm');
		expect(submitButton().textContent?.trim()).toBe(m.action_save_changes());
		expect(submitButton().disabled).toBe(false);
	});

	it('lists each assigned device once, keeping devices no longer in the device list', () => {
		const assignment = template().assignments[0];
		render({
			mode: 'edit',
			context: context({
				template: template({
					assignments: [
						assignment,
						{ ...assignment, id: 2, devEui: ' DEV-A ' },
						{ ...assignment, id: 3, devEui: '  ' },
						{ ...assignment, id: 4, devEui: 'DEV-GONE', deviceName: 'Old sensor' }
					]
				})
			})
		});

		expect(chips('report-form-devices-multiselect')).toEqual(['Freezer A (DEV-A)', 'DEV-GONE']);
	});

	it('saves the changes to the template and returns to the reports list', async () => {
		services.reports.updateReportTemplate.mockResolvedValue(template());
		render({ mode: 'edit', context: context({ template: template() }) });

		type(byId<HTMLTextAreaElement>('report-form-description-textarea')!, 'Every Monday');
		click(submitButton());

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/reports'));
		expect(services.reports.updateReportTemplate).toHaveBeenCalledWith(7, {
			name: 'Weekly cold room',
			description: 'Every Monday',
			isActive: false,
			deviceTypeId: 5,
			devEuis: ['DEV-A'],
			schedule: [
				{ endOfDay: false, endOfWeek: true, endOfMonth: true, utcOffset: 9, isActive: true }
			],
			recipients: [{ communicationMethod: 2, email: 'night@example.com', name: 'Night shift' }],
			alertPoints: [
				{
					dataPointKey: 'temperature_c',
					name: 'Too warm',
					hexColor: '#FF0000',
					operator: '>',
					value: 8
				}
			],
			dataProcessingSchedules: [
				{
					dayOfWeek: 2,
					startTime: '08:00',
					endTime: '18:00',
					crossesMidnight: false,
					isEnabled: true,
					ruleType: 'include',
					timezone: 'Asia/Tokyo'
				}
			],
			dataPullInterval: 120
		});
		expect(services.reports.createReportTemplate).not.toHaveBeenCalled();
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.reports_new_updated_success({ name: 'Weekly cold room' }),
			duration: 4000,
			dismissible: true
		});
	});

	it('lists what a saved template is missing once the user edits it', () => {
		const [recipient] = template().recipients;
		render({
			mode: 'edit',
			context: context({ template: template({ recipients: [{ ...recipient, email: null }] }) })
		});
		expect(submitButton().disabled).toBe(true);
		expect(validationNotice()).toBeNull();

		type(byId<HTMLTextAreaElement>('report-form-description-textarea')!, 'Every Monday');

		expect(validationIssues()).toEqual([
			m.reports_new_validation_recipient_email_required({ index: '1' })
		]);
	});

	it('says what an edited template is missing', () => {
		render({ mode: 'edit', context: context({ template: template() }) });
		expect(validationNotice()).toBeNull();

		type(byId<HTMLInputElement>('report-form-name-input')!, '');

		expect(validationIssues()).toEqual([m.reports_create_validation_report_name_required()]);
		expect(submitButton().disabled).toBe(true);
	});

	it('creates a template in edit mode when there is none to update', async () => {
		services.reports.createReportTemplate.mockResolvedValue(template());
		render({ mode: 'edit', preselectedDevEui: 'DEV-A' });
		type(byId<HTMLInputElement>('report-form-name-input')!, 'Weekly cold room');
		type(byId<HTMLInputElement>('report-recipients-0-email-input')!, 'ops@example.com');

		click(submitButton());

		await vi.waitFor(() => expect(services.reports.createReportTemplate).toHaveBeenCalled());
		expect(services.reports.updateReportTemplate).not.toHaveBeenCalled();
		expect(view!.toasts()[0]?.message).toBe(
			m.reports_new_created_success({ name: 'Weekly cold room' })
		);
	});
});
