import type { ActionResult } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import type { AppContext } from '$lib/appContext.svelte';
import { Capability } from '$lib/auth/capabilities';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { testEvent, testLocals } from '$lib/testing/server';
import SettingsPage from './+page.svelte';
import { actions } from './+page.server';

type Submit = (input: Record<string, unknown>) => unknown;
type AfterSubmit = (input: {
	result: ActionResult;
	update: (options?: { reset?: boolean }) => Promise<void>;
}) => Promise<void>;

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

// `use:enhance` without the network: the mock keeps each form's submit
// function so a test can run it and hand it the action's result.
const { forms } = vi.hoisted(() => ({ forms: new Map<HTMLFormElement, Submit>() }));
vi.mock('$app/forms', () => ({
	enhance: (form: HTMLFormElement, submit: Submit) => {
		forms.set(form, submit);
		const onSubmit = (event: Event) => event.preventDefault();
		form.addEventListener('submit', onSubmit);
		return {
			destroy: () => {
				forms.delete(form);
				form.removeEventListener('submit', onSubmit);
			}
		};
	}
}));

const DATA = {
	devEui: 'dev-1',
	deviceName: 'Air sensor',
	location_id: 8 as number | undefined,
	deviceGroup: 'Barn',
	ttiName: 'cw-air-01',
	locations: [
		{ location_id: 8, name: 'North field' },
		{ location_id: 9, name: 'South field' }
	] as Array<{ location_id: number; name: string }> | undefined,
	sensorCertificates: [
		{
			key: 'sensor' as const,
			label: 'SHT43',
			serial: 'SN-43',
			product: 'CW-AIR',
			downloadDisabledReason: null
		}
	],
	supportsSensorCertificates: true,
	deviceOwners: [
		{
			id: 2,
			key: 'ada@example.com',
			name: 'Ada',
			email: 'ada@example.com',
			userId: 'user-1',
			permissionLevel: 1
		}
	],
	license: { id: 12, seatIndex: 0, manual: false } as {
		id: number;
		seatIndex: number;
		manual: boolean;
	} | null,
	deviceOwnerId: 'owner-1' as string | null,
	deviceOrgId: 'org-1' as string | null
};

type Data = typeof DATA;
type FormPayload = Record<string, unknown> | null;

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	overrides: Partial<Data> = {},
	form: FormPayload = null,
	app: Partial<AppContext> = { session: session('owner-1') }
) {
	let data = $state.raw({ ...DATA, ...overrides });
	view = renderWithServices(SettingsPage, {
		props: {
			get data() {
				return data;
			},
			form,
			params: { location_id: '8', dev_eui: 'dev-1' }
		} as never,
		app
	});
	return {
		...view,
		/** What the save's reload hands the page: freshly loaded data. */
		setData(next: Data) {
			data = next;
			flushSync();
		}
	};
}

function session(sub: string): IJWT {
	return { sub, email: 'user@example.com', exp: 4102444800 } as IJWT;
}

function orgContext(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: null,
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

const org = (id: string, capabilities: string[]) =>
	({ id, type: 'company', name: 'Farm Co', role: 'owner', capabilities }) as MeContextDto['org'];

const byId = <T extends HTMLElement = HTMLInputElement>(id: string) =>
	document.getElementById(id) as T | null;
const deviceForm = () => byId<HTMLFormElement>('device-settings-form');
const certificateForm = () => byId<HTMLFormElement>('device-certificates-sensor-form');
const submitButton = () => byId<HTMLButtonElement>('device-settings-submit-button');
const chips = () =>
	[...(deviceForm()?.querySelectorAll('.cw-chip') ?? [])].map((chip) => chip.textContent?.trim());
const fieldError = (id: string) =>
	byId(id)
		?.closest('.cw-input, .cw-dropdown')
		?.querySelector('.cw-input__message--error, .cw-dropdown__message--error')?.textContent ?? null;
const dangerZone = () => byId('device-delete-open-button');

function type(id: string, value: string) {
	const input = byId(id);
	if (!input) throw new Error(`#${id} is not rendered`);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function chooseLocation(label: string) {
	byId<HTMLButtonElement>('device-settings-location-select')?.click();
	flushSync();
	const option = [
		...document.querySelectorAll<HTMLElement>('#device-settings-form [role="option"]')
	].find((element) => element.textContent?.trim() === label);
	if (!option) throw new Error(`No location option "${label}"`);
	option.click();
	flushSync();
}

/** Runs the device form's enhance submit function; returns its cancel spy and result callback. */
function submitDeviceForm() {
	const form = deviceForm();
	const submitFn = form && forms.get(form);
	if (!form || !submitFn) throw new Error('the device form is not enhanced');
	const cancel = vi.fn();
	const after = submitFn({ cancel, formData: new FormData(form), formElement: form }) as
		| AfterSubmit
		| undefined;
	flushSync();
	return { cancel, after };
}

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	forms.clear();
});

describe('device settings page', () => {
	it('is titled with the DevEUI and goes back to the device', () => {
		render();

		expect(document.title).toBe(m.devices_settings_page_title({ devEui: 'DEV-1' }));
		expect(byId('device-settings-back-button')?.textContent).toContain(m.devices_back_to_detail());
		byId<HTMLButtonElement>('device-settings-back-button')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/dev-1');
	});

	it('shows the DevEUI and, when there is one, the current group', () => {
		render();
		expect(chips()).toEqual([
			m.devices_deveui_chip({ devEui: 'DEV-1' }),
			m.devices_current_group_chip({ group: 'Barn' })
		]);
		view?.unmount();

		render({ deviceGroup: '' });
		expect(chips()).toEqual([m.devices_deveui_chip({ devEui: 'DEV-1' })]);
	});

	it('fills the form from the device, with nothing to save yet', () => {
		render();

		expect(byId('device-settings-name-input')?.value).toBe('Air sensor');
		expect(byId('device-settings-group-input')?.value).toBe('Barn');
		expect(byId('device-settings-tti-name-input')?.value).toBe('cw-air-01');
		expect(byId('device-settings-location-select')?.textContent?.trim()).toBe('North field');
		expect([
			byId('device-settings-group-hidden-input')?.value,
			byId('device-settings-tti-name-hidden-input')?.value,
			byId('device-settings-location-hidden-input')?.value
		]).toEqual(['Barn', 'cw-air-01', '8']);
		expect(submitButton()?.disabled).toBe(true);
		expect(deviceForm()?.querySelector('.app-notice')).toBeNull();
	});

	it('can be saved once something changed, and sends the group and TTI id normalized', () => {
		render();

		type('device-settings-name-input', 'Air sensor 2');
		expect(submitButton()?.disabled).toBe(false);
		type('device-settings-name-input', ' Air sensor ');
		expect(submitButton()?.disabled).toBe(true);

		type('device-settings-group-input', '  Barn 2 ');
		expect(byId('device-settings-group-hidden-input')?.value).toBe('Barn 2');
		expect(submitButton()?.disabled).toBe(false);
		type('device-settings-group-input', 'Barn');

		type('device-settings-tti-name-input', ' CW-AIR-01 ');
		expect(byId('device-settings-tti-name-hidden-input')?.value).toBe('cw-air-01');
		expect(submitButton()?.disabled).toBe(true);
		type('device-settings-tti-name-input', 'cw-air-02');
		expect(submitButton()?.disabled).toBe(false);
	});

	it('requires a name', () => {
		render();

		type('device-settings-name-input', '   ');

		expect(fieldError('device-settings-name-input')).toBe(m.devices_device_name_required());
		expect(submitButton()?.disabled).toBe(true);
	});

	it('flags a name or group longer than 120 characters', () => {
		render({ deviceName: 'n'.repeat(121), deviceGroup: 'g'.repeat(121) });
		type('device-settings-tti-name-input', 'cw-air-02');

		expect(fieldError('device-settings-name-input')).toBe(
			m.devices_device_name_length({ max: '120' })
		);
		expect(fieldError('device-settings-group-input')).toBe(
			m.devices_device_group_length({ max: '120' })
		);
		expect(submitButton()?.disabled).toBe(true);
	});

	it('moves the device to another location, while its links stay on the saved one', () => {
		render();
		byId<HTMLButtonElement>('device-settings-location-select')?.click();
		flushSync();
		expect(
			[...document.querySelectorAll('#device-settings-form [role="option"]')].map((option) =>
				option.textContent?.trim()
			)
		).toEqual([m.devices_unassigned_location(), 'North field', 'South field']);
		byId<HTMLButtonElement>('device-settings-location-select')?.click();
		flushSync();

		chooseLocation('South field');

		expect(byId('device-settings-location-hidden-input')?.value).toBe('9');
		expect(submitButton()?.disabled).toBe(false);
		// Not saved yet: the device is still in location 8.
		expect(certificateForm()?.getAttribute('action')).toBe(
			'/locations/8/devices/dev-1/settings/libellus-certificates/sensor'
		);
		byId<HTMLButtonElement>('device-settings-back-button')?.click();
		expect(goto).toHaveBeenCalledWith('/locations/8/devices/dev-1');
	});

	it('can choose "Unassigned" without breaking the page or its links', () => {
		render();

		chooseLocation(m.devices_unassigned_location());

		expect(byId('device-settings-location-hidden-input')?.value).toBe('');
		expect(certificateForm()?.getAttribute('action')).toBe(
			'/locations/8/devices/dev-1/settings/libellus-certificates/sensor'
		);
		expect(byId<HTMLButtonElement>('device-certificates-sensor-download-button')?.disabled).toBe(
			false
		);
		byId<HTMLButtonElement>('device-settings-back-button')?.click();
		expect(goto).toHaveBeenCalledWith('/locations/8/devices/dev-1');
	});

	it('follows the location the device was saved in', () => {
		const page = render();
		chooseLocation('South field');

		// The save succeeded and the page data was reloaded with the new location.
		page.setData({ ...DATA, location_id: 9 });

		expect(certificateForm()?.getAttribute('action')).toBe(
			'/locations/9/devices/dev-1/settings/libellus-certificates/sensor'
		);
		byId<HTMLButtonElement>('device-settings-back-button')?.click();
		expect(goto).toHaveBeenCalledWith('/locations/9/devices/dev-1');
	});

	it('renders a device that has no location, with its location links disabled', () => {
		render({ location_id: undefined });

		expect(byId('device-settings-name-input')?.value).toBe('Air sensor');
		expect(byId('device-settings-location-select')?.textContent?.trim()).toBe(
			m.devices_unassigned_location()
		);
		const back = byId<HTMLButtonElement>('device-settings-back-button');
		expect(back?.disabled).toBe(true);
		back?.click();
		expect(goto).not.toHaveBeenCalled();
		expect(certificateForm()?.hasAttribute('action')).toBe(false);
		expect(byId<HTMLButtonElement>('device-certificates-sensor-download-button')?.disabled).toBe(
			true
		);
		// The series certificate is a static file and still downloads.
		expect(byId<HTMLButtonElement>('device-certificates-series-download-button')?.disabled).toBe(
			false
		);
	});

	it('posts group, TTI device id and location once each, normalized, which the action saves', async () => {
		render();
		type('device-settings-group-input', '  Barn 2 ');
		type('device-settings-tti-name-input', ' CW-AIR-02 ');
		chooseLocation('South field');

		// What SvelteKit's `enhance` posts: the form's own fields.
		const posted = new FormData(deviceForm() ?? undefined);
		expect(['name', 'group', 'tti_name', 'location_id'].map((name) => posted.getAll(name))).toEqual(
			[['Air sensor'], ['Barn 2'], ['cw-air-02'], ['9']]
		);

		const locals = testLocals();
		locals.services.devices.updateDevice.mockResolvedValue({});
		await expect(
			actions.updateDevice(
				testEvent<Parameters<(typeof actions)['updateDevice']>[0]>({
					locals,
					params: { location_id: '8', dev_eui: 'dev-1' },
					request: new Request('http://localhost/?/updateDevice', { method: 'POST', body: posted })
				})
			)
		).resolves.toMatchObject({ action: 'updateDevice', success: true });
		expect(locals.services.devices.updateDevice).toHaveBeenCalledWith('dev-1', {
			name: 'Air sensor',
			group: 'Barn 2',
			location_id: 9,
			tti_name: 'cw-air-02'
		});
	});

	it('submits only a valid change, showing progress until the update is done', async () => {
		render();
		const unchanged = submitDeviceForm();
		expect(unchanged.cancel).toHaveBeenCalled();
		expect(unchanged.after).toBeUndefined();

		type('device-settings-name-input', 'Air sensor 2');
		const { cancel, after } = submitDeviceForm();
		expect(cancel).not.toHaveBeenCalled();
		expect(submitButton()?.getAttribute('aria-busy')).toBe('true');

		const update = vi.fn(async () => {});
		await after?.({ result: { type: 'success', status: 200 }, update });
		flushSync();

		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(submitButton()?.getAttribute('aria-busy')).toBeNull();
		expect(submitButton()?.disabled).toBe(false);
	});

	it('stops showing progress even if the update fails', async () => {
		render();
		type('device-settings-name-input', 'Air sensor 2');
		const update = vi.fn(async () => {
			throw new Error('update failed');
		});

		await expect(
			submitDeviceForm().after?.({ result: { type: 'failure', status: 400 }, update })
		).rejects.toThrow('update failed');
		flushSync();

		expect(submitButton()?.getAttribute('aria-busy')).toBeNull();
	});

	it("shows the save result and the server's field errors", () => {
		render(
			{},
			{
				action: 'updateDevice',
				success: false,
				message: m.validation_correct_highlighted_fields(),
				fieldErrors: {
					name: 'Name taken',
					group: 'Group refused',
					tti_name: 'TTI id refused',
					location_id: 'Location refused'
				}
			}
		);

		expect(deviceForm()?.querySelector('.app-notice--danger')?.textContent).toContain(
			m.validation_correct_highlighted_fields()
		);
		expect(fieldError('device-settings-name-input')).toBe('Name taken');
		expect(fieldError('device-settings-group-input')).toBe('Group refused');
		expect(fieldError('device-settings-tti-name-input')).toBe('TTI id refused');
		expect(fieldError('device-settings-location-select')).toBe('Location refused');

		type('device-settings-name-input', 'Air sensor 2');
		expect(submitButton()?.disabled).toBe(true);
		view?.unmount();

		render({}, { action: 'updateDevice', success: true, message: m.devices_settings_updated() });
		expect(deviceForm()?.querySelector('.app-notice--success')?.textContent).toContain(
			m.devices_settings_updated()
		);
	});

	it("leaves other actions' results to their cards", () => {
		render(
			{},
			{
				action: 'unassignLicense',
				success: true,
				message: 'License unassigned',
				fieldErrors: { name: 'Not for this form' }
			}
		);

		expect(deviceForm()?.querySelector('.app-notice')).toBeNull();
		expect(fieldError('device-settings-name-input')).toBeNull();
		expect(
			byId<HTMLFormElement>('device-license-form')?.querySelector('.app-notice--success')
				?.textContent
		).toContain('License unassigned');
	});

	it('shows the license, certificate and owner cards for the device', () => {
		render();

		expect(
			byId<HTMLFormElement>('device-license-form')?.querySelector<HTMLInputElement>(
				'input[name="licenseId"]'
			)?.value
		).toBe('12');
		expect(byId<HTMLFormElement>('device-certificates-sensor-form')?.getAttribute('action')).toBe(
			'/locations/8/devices/dev-1/settings/libellus-certificates/sensor'
		);
		expect(document.body.textContent).toContain('Ada (ada@example.com)');
	});

	it('shows no certificate card for a device that has no certificates', () => {
		render({ supportsSensorCertificates: false });

		expect(byId('device-certificates-series-form')).toBeNull();
		expect(document.body.textContent).not.toContain(m.devices_sensor_certificates_title());
	});

	it('renders the empty page the load returns without a session', () => {
		render(
			{
				devEui: '',
				deviceName: '',
				deviceGroup: '',
				ttiName: '',
				location_id: undefined,
				locations: undefined,
				sensorCertificates: [],
				supportsSensorCertificates: false,
				deviceOwners: [],
				license: null,
				deviceOwnerId: null,
				deviceOrgId: null
			},
			null,
			{ orgContext: orgContext({ is_staff: true }) }
		);

		expect(chips()).toEqual([m.devices_deveui_chip({ devEui: '' }).trim()]);
		expect(byId('device-settings-name-input')?.value).toBe('');
		expect(fieldError('device-settings-name-input')).toBe(m.devices_device_name_required());
		expect(byId('device-settings-location-hidden-input')?.value).toBe('');
		expect(document.body.textContent).toContain(m.devices_license_none_assigned());
		expect(document.body.textContent).toContain(m.devices_no_device_owners());
		expect(dangerZone()).toBeNull();
	});

	it('treats fields missing from the data as empty', () => {
		render({
			deviceName: undefined,
			deviceGroup: undefined,
			ttiName: undefined,
			sensorCertificates: undefined,
			supportsSensorCertificates: undefined,
			deviceOwners: undefined,
			license: undefined
		} as unknown as Partial<Data>);

		expect(byId('device-settings-name-input')?.value).toBe('');
		expect(byId('device-settings-group-input')?.value).toBe('');
		expect(byId('device-settings-tti-name-input')?.value).toBe('');
		expect(chips()).toEqual([m.devices_deveui_chip({ devEui: 'DEV-1' })]);
		expect(submitButton()?.disabled).toBe(true);
		expect(byId('device-certificates-series-form')).toBeNull();
		expect(document.body.textContent).toContain(m.devices_license_none_assigned());
		expect(document.body.textContent).toContain(m.devices_no_device_owners());

		byId<HTMLButtonElement>('device-delete-open-button')?.click();
		flushSync();
		expect(
			byId('device-delete-confirm-button')?.closest('dialog')?.querySelector('.cw-dialog__title')
				?.textContent
		).toBe(m.devices_delete_dialog_title({ name: 'DEV-1' }));
	});

	it('falls back to UNKNOWN without a DevEUI', () => {
		render({ devEui: undefined, supportsSensorCertificates: false } as unknown as Partial<Data>);

		expect(document.title).toBe(m.devices_settings_page_title({ devEui: 'UNKNOWN' }));
		expect(chips()[0]).toBe(m.devices_deveui_chip({ devEui: 'UNKNOWN' }));
	});
});

describe('device settings danger zone', () => {
	it.each([
		['staff', { orgContext: orgContext({ is_staff: true }) }, {}],
		['the device owner', { session: session('owner-1') }, {}],
		[
			'an owner of the device org who may delete devices',
			{ orgContext: orgContext({ org: org('org-1', [Capability.DeviceDelete]) }) },
			{}
		]
	] as Array<[string, Partial<AppContext>, Partial<Data>]>)(
		'is offered to %s',
		(_who, app, data) => {
			render(data, null, app);

			expect(dangerZone()).not.toBeNull();
			expect(document.body.textContent).toContain(m.danger_zone_title());
		}
	);

	it.each([
		['another user', { session: session('user-2') }, {}],
		[
			'a session without a user id, for a device without one',
			{ session: session('') },
			{ deviceOwnerId: '' }
		],
		['nobody signed in', {}, {}],
		[
			'an org member without the capability',
			{ orgContext: orgContext({ org: org('org-1', [Capability.DeviceReplace]) }) },
			{}
		],
		[
			'an org owner of another org',
			{ orgContext: orgContext({ org: org('org-2', [Capability.DeviceDelete]) }) },
			{}
		],
		[
			'an org owner, for a device that belongs to no org',
			{ orgContext: orgContext({ org: org('org-1', [Capability.DeviceDelete]) }) },
			{ deviceOrgId: null }
		],
		[
			'staff, without a DevEUI',
			{ orgContext: orgContext({ is_staff: true }) },
			{ devEui: '', supportsSensorCertificates: false }
		]
	] as Array<[string, Partial<AppContext>, Partial<Data>]>)(
		'is not offered to %s',
		(_who, app, data) => {
			render(data, null, app);

			expect(dangerZone()).toBeNull();
		}
	);

	it("passes the device's name and the delete result to the danger zone", () => {
		render({}, { action: 'deleteDevice', message: 'Owner only' });

		expect(dangerZone()?.closest('.cw-card')?.textContent).toContain('Owner only');
		byId<HTMLButtonElement>('device-delete-open-button')?.click();
		flushSync();
		const dialog = byId('device-delete-confirm-button')?.closest('dialog');
		expect(dialog?.open).toBe(true);
		expect(dialog?.querySelector('.cw-dialog__title')?.textContent).toBe(
			m.devices_delete_dialog_title({ name: 'Air sensor' })
		);
	});
});
