import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import {
	addPermission,
	deleteLocation,
	editPermission,
	readString,
	readUnknownString,
	removePermission,
	updateLocationCoordinates,
	updateLocationName,
	updateUserPermissionLevel
} from './location-settings-actions.server';

const ACTIONS = {
	updateLocationName,
	updateLocationCoordinates,
	addPermission,
	editPermission,
	updateUserPermissionLevel,
	removePermission,
	deleteLocation
};
type ActionName = keyof typeof ACTIONS;

/** What a repository throws for a non-2xx response: the body wrapped as `{ url, payload }`. */
const apiError = (status: number, message = 'Rejected by the API') =>
	new ApiError(status, 'Error', {
		url: 'https://api.cropwatch.test/locations/8',
		payload: { message }
	});
/** A non-2xx response whose body carries no message. */
const silentApiError = (status: number) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/locations/8', payload: {} });
/** What `fetch` throws when the API cannot be reached. */
const offlineError = () => new TypeError('Failed to fetch');

function act(
	name: ActionName,
	locals: TestLocals,
	fields: Record<string, string> = {},
	location_id = '8'
) {
	const action = ACTIONS[name] as unknown as (event: unknown) => Promise<unknown>;
	return action(
		testEvent({ locals, params: { location_id }, request: formRequest(fields) })
	) as Promise<{ status?: number; data?: Record<string, unknown> } & Record<string, unknown>>;
}

const EMPTY_ADD_VALUES = {
	newUserEmail: '',
	userId: '',
	permission_level: 5,
	applyToAllDevices: false
};
const EMPTY_EDIT_VALUES = { ownerId: '', permissionId: '', userId: '', applyToAllDevices: false };

/** Per action: valid fields, how its API call fails, and its own failure message. */
const API_CALLS: Record<
	ActionName,
	{
		fields: Record<string, string>;
		reject: (locals: TestLocals, error: unknown) => void;
		fallback: string;
	}
> = {
	updateLocationName: {
		fields: { locationName: 'Greenhouse B' },
		reject: (locals, error) => locals.services.locations.updateLocation.mockRejectedValue(error),
		fallback: m.locations_update_name_failed()
	},
	updateLocationCoordinates: {
		fields: { lat: '31', long: '131' },
		reject: (locals, error) => locals.services.locations.updateLocation.mockRejectedValue(error),
		fallback: m.location_coordinates_save_failed()
	},
	addPermission: {
		fields: { newUserEmail: 'ada@example.com', permission_level: '3' },
		reject: (locals, error) =>
			locals.services.locations.createLocationPermission.mockRejectedValue(error),
		fallback: m.locations_permission_create_failed()
	},
	editPermission: {
		fields: { ownerId: '3', userId: 'user-2' },
		reject: (locals, error) =>
			locals.services.locations.updateLocationPermission.mockRejectedValue(error),
		fallback: m.locations_permission_update_failed()
	},
	updateUserPermissionLevel: {
		fields: { email: 'ada@example.com', permission_level: '3' },
		reject: (locals, error) =>
			locals.services.locations.updateLocationPermissionLevel.mockRejectedValue(error),
		fallback: m.locations_user_permission_level_update_failed()
	},
	removePermission: {
		fields: { permission_id: '14' },
		reject: (locals, error) =>
			locals.services.locations.deleteLocationPermission.mockRejectedValue(error),
		fallback: m.locations_permission_remove_failed()
	},
	deleteLocation: {
		fields: { confirmLocationName: 'Greenhouse A', acknowledged: 'yes' },
		reject: (locals, error) => locals.services.locations.getLocation.mockRejectedValue(error),
		fallback: m.locations_delete_rejected()
	}
};

describe('form value readers', () => {
	it('reads trimmed strings from form fields, and nothing from files or missing fields', () => {
		expect(readString('  Greenhouse ')).toBe('Greenhouse');
		expect(readString(null)).toBe('');
		expect(readString(new File(['x'], 'x.txt'))).toBe('');
	});

	it('reads trimmed strings and finite numbers from unknown values', () => {
		expect(readUnknownString(' 8 ')).toBe('8');
		expect(readUnknownString(8)).toBe('8');
		expect(readUnknownString(Number.NaN)).toBe('');
		expect(readUnknownString(null)).toBe('');
		expect(readUnknownString({ id: 8 })).toBe('');
	});
});

describe('every settings action', () => {
	const requiresLogin: Record<ActionName, string> = {
		updateLocationName: m.locations_update_name_requires_login(),
		updateLocationCoordinates: m.locations_update_name_requires_login(),
		addPermission: m.locations_manage_permissions_requires_login(),
		editPermission: m.locations_manage_permissions_requires_login(),
		updateUserPermissionLevel: m.locations_manage_permissions_requires_login(),
		removePermission: m.locations_manage_permissions_requires_login(),
		deleteLocation: m.locations_delete_requires_login()
	};

	it('requires a session', async () => {
		for (const name of Object.keys(ACTIONS) as ActionName[]) {
			await expect(act(name, testLocals({ jwtString: null }))).resolves.toMatchObject({
				status: 401,
				data: { action: name, message: requiresLogin[name] }
			});
		}
	});

	it('echoes empty form values with the login error where the form keeps them', async () => {
		const signedOut = () => testLocals({ jwtString: null });

		expect((await act('addPermission', signedOut())).data?.values).toEqual(EMPTY_ADD_VALUES);
		expect((await act('editPermission', signedOut())).data?.values).toEqual(EMPTY_EDIT_VALUES);
		expect((await act('removePermission', signedOut())).data?.values).toEqual(EMPTY_ADD_VALUES);
	});

	it('rejects an unusable location id before calling the API', async () => {
		for (const name of Object.keys(ACTIONS) as ActionName[]) {
			for (const location_id of ['abc', ' ']) {
				const locals = testLocals();

				await expect(act(name, locals, API_CALLS[name].fields, location_id)).resolves.toMatchObject(
					{ status: 400, data: { action: name, message: m.locations_invalid_location_id() } }
				);
			}
		}
	});

	it("shows the API's own message, with the API's status", async () => {
		for (const name of Object.keys(ACTIONS) as ActionName[]) {
			const locals = testLocals();
			API_CALLS[name].reject(locals, apiError(409, 'Name already taken'));

			await expect(act(name, locals, API_CALLS[name].fields)).resolves.toMatchObject({
				status: 409,
				data: { action: name, message: 'Name already taken' }
			});
		}
	});

	it('falls back to its own message when the API gives none, and to 502 when it cannot be reached', async () => {
		for (const name of Object.keys(ACTIONS) as ActionName[]) {
			const { fields, reject, fallback } = API_CALLS[name];
			const silent = testLocals();
			reject(silent, silentApiError(500));
			const offline = testLocals();
			reject(offline, offlineError());

			await expect(act(name, silent, fields)).resolves.toMatchObject({
				status: 500,
				data: { action: name, message: fallback }
			});
			await expect(act(name, offline, fields)).resolves.toMatchObject({
				status: 502,
				data: { action: name, message: fallback }
			});
		}
	});
});

describe('updateLocationName', () => {
	it('saves the trimmed name and group', async () => {
		const locals = testLocals();
		locals.services.locations.updateLocation.mockResolvedValue({});

		await expect(
			act('updateLocationName', locals, { locationName: ' Greenhouse B ', group: ' Farm ' })
		).resolves.toEqual({
			action: 'updateLocationName',
			success: true,
			message: m.locations_name_updated()
		});
		expect(locals.services.locations.updateLocation).toHaveBeenCalledWith(8, {
			name: 'Greenhouse B',
			group: 'Farm'
		});
	});

	it('requires a name', async () => {
		const locals = testLocals();

		await expect(act('updateLocationName', locals, { locationName: ' ' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.locations_name_cannot_be_empty() }
		});
		expect(locals.services.locations.updateLocation).not.toHaveBeenCalled();
	});

	it("uses the API's status and message, else 502 and the fallback", async () => {
		const forbidden = testLocals();
		forbidden.services.locations.updateLocation.mockRejectedValue(
			apiError(403, 'Only the owner can rename it')
		);
		await expect(
			act('updateLocationName', forbidden, { locationName: 'B' })
		).resolves.toMatchObject({
			status: 403,
			data: { action: 'updateLocationName', message: 'Only the owner can rename it' }
		});

		const offline = testLocals();
		offline.services.locations.updateLocation.mockRejectedValue(offlineError());
		await expect(act('updateLocationName', offline, { locationName: 'B' })).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_update_name_failed() }
		});
	});
});

describe('updateLocationCoordinates', () => {
	function saved() {
		const locals = testLocals();
		locals.services.locations.updateLocation.mockResolvedValue({});
		return locals;
	}

	it('saves the position with the map zoom', async () => {
		const locals = saved();

		await expect(
			act('updateLocationCoordinates', locals, {
				lat: ' 31.9147 ',
				long: '131.4232',
				map_zoom: '15'
			})
		).resolves.toEqual({
			action: 'updateLocationCoordinates',
			success: true,
			message: m.location_coordinates_saved()
		});
		expect(locals.services.locations.updateLocation).toHaveBeenCalledWith(8, {
			lat: 31.9147,
			long: 131.4232,
			map_zoom: 15
		});
	});

	it('leaves the zoom out when it is missing or outside 0–22', async () => {
		for (const map_zoom of ['', '23', '-1', 'far']) {
			const locals = saved();
			await act('updateLocationCoordinates', locals, { lat: '-90', long: '180', map_zoom });
			expect(locals.services.locations.updateLocation).toHaveBeenCalledWith(8, {
				lat: -90,
				long: 180
			});
		}

		const edge = saved();
		await act('updateLocationCoordinates', edge, { lat: '1', long: '2', map_zoom: '0' });
		expect(edge.services.locations.updateLocation).toHaveBeenCalledWith(8, {
			lat: 1,
			long: 2,
			map_zoom: 0
		});
	});

	it('clears both coordinates when both fields are blank', async () => {
		const locals = saved();

		await expect(
			act('updateLocationCoordinates', locals, { lat: ' ', long: '', map_zoom: '12' })
		).resolves.toMatchObject({ success: true, message: m.location_coordinates_cleared() });
		expect(locals.services.locations.updateLocation).toHaveBeenCalledWith(8, {
			lat: null,
			long: null
		});
	});

	it('rejects a missing or out-of-range half, echoing what was typed', async () => {
		const locals = testLocals();
		const reject = (fields: Record<string, string>) =>
			act('updateLocationCoordinates', locals, fields);

		await expect(reject({ lat: '', long: '131' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.location_coordinates_invalid_latitude(), lat: '', long: '131' }
		});
		await expect(reject({ lat: '91', long: '131' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.location_coordinates_invalid_latitude() }
		});
		await expect(reject({ lat: '31', long: '' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.location_coordinates_invalid_longitude(), lat: '31', long: '' }
		});
		await expect(reject({ lat: '31', long: 'east' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.location_coordinates_invalid_longitude() }
		});
		expect(locals.services.locations.updateLocation).not.toHaveBeenCalled();
	});

	it("reports a failed save with the API's message, or the fallback, and the typed values", async () => {
		const locals = testLocals();
		locals.services.locations.updateLocation.mockRejectedValue(apiError(422, 'Too far north'));

		await expect(
			act('updateLocationCoordinates', locals, { lat: '31', long: '131' })
		).resolves.toMatchObject({
			status: 422,
			data: { message: 'Too far north', lat: '31', long: '131' }
		});

		const offline = testLocals();
		offline.services.locations.updateLocation.mockRejectedValue(offlineError());
		await expect(
			act('updateLocationCoordinates', offline, { lat: '', long: '' })
		).resolves.toMatchObject({
			status: 502,
			data: { message: m.location_coordinates_save_failed(), lat: '', long: '' }
		});
	});
});

describe('addPermission', () => {
	it('grants the level to the email, on all devices when asked', async () => {
		const locals = testLocals();
		locals.services.locations.createLocationPermission.mockResolvedValue({} as LocationDto);

		await expect(
			act('addPermission', locals, {
				newUserEmail: ' ada@example.com ',
				permission_level: '2',
				applyToAllDevices: 'true'
			})
		).resolves.toEqual({
			action: 'addPermission',
			success: true,
			message: m.locations_permission_created(),
			values: EMPTY_ADD_VALUES
		});
		expect(locals.services.locations.createLocationPermission).toHaveBeenCalledWith(
			8,
			'ada@example.com',
			2,
			true
		);
	});

	it('defaults to Disabled, and to this location only', async () => {
		const locals = testLocals();
		locals.services.locations.createLocationPermission.mockResolvedValue({} as LocationDto);

		await act('addPermission', locals, { newUserEmail: 'ada@example.com', permission_level: 'x' });

		expect(locals.services.locations.createLocationPermission).toHaveBeenCalledWith(
			8,
			'ada@example.com',
			5,
			false
		);
	});

	it('flags a missing or malformed email', async () => {
		const locals = testLocals();

		await expect(act('addPermission', locals, { permission_level: '3' })).resolves.toMatchObject({
			status: 400,
			data: {
				message: m.validation_correct_highlighted_fields(),
				fieldErrors: { newUserEmail: m.validation_user_email_required() },
				values: { newUserEmail: '', permission_level: 3, applyToAllDevices: false }
			}
		});
		await expect(act('addPermission', locals, { newUserEmail: 'ada@' })).resolves.toMatchObject({
			status: 400,
			data: { fieldErrors: { newUserEmail: m.validation_valid_email_required() } }
		});
		expect(locals.services.locations.createLocationPermission).not.toHaveBeenCalled();
	});

	it('keeps the input when the API refuses', async () => {
		const locals = testLocals();
		locals.services.locations.createLocationPermission.mockRejectedValue(
			apiError(404, 'No user with that email')
		);

		await expect(
			act('addPermission', locals, { newUserEmail: 'ada@example.com', permission_level: '4' })
		).resolves.toMatchObject({
			status: 404,
			data: {
				message: 'No user with that email',
				values: { newUserEmail: 'ada@example.com', permission_level: 4 },
				fieldErrors: {}
			}
		});

		const offline = testLocals();
		offline.services.locations.createLocationPermission.mockRejectedValue(offlineError());
		await expect(
			act('addPermission', offline, { newUserEmail: 'ada@example.com' })
		).resolves.toMatchObject({
			status: 502,
			data: {
				message: m.locations_permission_create_failed(),
				values: { newUserEmail: 'ada@example.com' }
			}
		});
	});
});

describe('editPermission', () => {
	const FIELDS = { ownerId: '3', permissionId: '14', userId: 'user-2', applyToAllDevices: 'true' };

	it("updates the grant as the signed-in admin, with the grant's id", async () => {
		const locals = testLocals({ jwt: { sub: ' admin-1 ', email: 'a@b.c' } as IJWT });
		locals.services.locations.updateLocationPermission.mockResolvedValue({} as LocationDto);

		await expect(act('editPermission', locals, FIELDS)).resolves.toEqual({
			action: 'editPermission',
			success: true,
			message: m.locations_permission_updated(),
			values: EMPTY_EDIT_VALUES
		});
		expect(locals.services.locations.updateLocationPermission).toHaveBeenCalledWith(
			8,
			{ admin_user_id: 'admin-1', location_id: 8, user_id: 'user-2', owner_id: 3, id: 14 },
			true
		);
	});

	it('leaves the id out when none is given', async () => {
		const locals = testLocals({ jwt: { sub: 'admin-1', email: 'a@b.c' } as IJWT });
		locals.services.locations.updateLocationPermission.mockResolvedValue({} as LocationDto);

		await act('editPermission', locals, { ...FIELDS, permissionId: '', applyToAllDevices: '' });

		expect(locals.services.locations.updateLocationPermission).toHaveBeenCalledWith(
			8,
			{ admin_user_id: 'admin-1', location_id: 8, user_id: 'user-2', owner_id: 3 },
			false
		);
	});

	it('needs the admin user id from the session', async () => {
		for (const jwt of [null, { email: 'a@b.c' }, { sub: '  ', email: 'a@b.c' }]) {
			const locals = testLocals({ jwt: jwt as IJWT | null });

			await expect(act('editPermission', locals, { ...FIELDS, userId: '' })).resolves.toMatchObject(
				{
					status: 400,
					data: {
						message: m.locations_missing_admin_user_id(),
						values: { ownerId: '3', permissionId: '14', userId: '' },
						fieldErrors: { userId: m.locations_user_id_required() }
					}
				}
			);
			expect(locals.services.locations.updateLocationPermission).not.toHaveBeenCalled();
		}
	});

	it('flags a missing grant or user', async () => {
		const locals = testLocals();

		await expect(act('editPermission', locals, { ownerId: 'x' })).resolves.toMatchObject({
			status: 400,
			data: {
				message: m.validation_correct_highlighted_fields(),
				fieldErrors: {
					ownerId: m.locations_select_permission_to_edit(),
					userId: m.locations_user_id_required()
				}
			}
		});
		expect(locals.services.locations.updateLocationPermission).not.toHaveBeenCalled();
	});

	it('keeps the input when the API refuses', async () => {
		const locals = testLocals();
		locals.services.locations.updateLocationPermission.mockRejectedValue(
			apiError(403, 'Admins only')
		);

		await expect(act('editPermission', locals, FIELDS)).resolves.toMatchObject({
			status: 403,
			data: {
				message: 'Admins only',
				values: { ownerId: '3', userId: 'user-2', applyToAllDevices: true },
				fieldErrors: {}
			}
		});

		const offline = testLocals();
		offline.services.locations.updateLocationPermission.mockRejectedValue(offlineError());
		await expect(act('editPermission', offline, FIELDS)).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_permission_update_failed(), values: { ownerId: '3' } }
		});
	});
});

describe('updateUserPermissionLevel', () => {
	it("sets the user's level by email", async () => {
		const locals = testLocals();
		locals.services.locations.updateLocationPermissionLevel.mockResolvedValue({} as LocationDto);

		await expect(
			act('updateUserPermissionLevel', locals, {
				email: ' ada@example.com ',
				permission_level: '3'
			})
		).resolves.toEqual({
			action: 'updateUserPermissionLevel',
			success: true,
			message: m.locations_user_permission_level_updated()
		});
		expect(locals.services.locations.updateLocationPermissionLevel).toHaveBeenCalledWith(
			8,
			'ada@example.com',
			3
		);
	});

	it('requires the email, then the level', async () => {
		const locals = testLocals();

		await expect(
			act('updateUserPermissionLevel', locals, { permission_level: '3' })
		).resolves.toMatchObject({ status: 400, data: { message: m.validation_email_required() } });
		await expect(
			act('updateUserPermissionLevel', locals, { email: 'ada@example.com' })
		).resolves.toMatchObject({
			status: 400,
			data: { message: m.locations_permission_level_required() }
		});
		expect(locals.services.locations.updateLocationPermissionLevel).not.toHaveBeenCalled();
	});

	it("reports a refusal with the API's message, or the fallback", async () => {
		const fields = { email: 'ada@example.com', permission_level: '3' };
		const locals = testLocals();
		locals.services.locations.updateLocationPermissionLevel.mockRejectedValue(
			apiError(409, 'The owner keeps Admin')
		);
		await expect(act('updateUserPermissionLevel', locals, fields)).resolves.toMatchObject({
			status: 409,
			data: { message: 'The owner keeps Admin' }
		});

		const offline = testLocals();
		offline.services.locations.updateLocationPermissionLevel.mockRejectedValue(offlineError());
		await expect(act('updateUserPermissionLevel', offline, fields)).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_user_permission_level_update_failed() }
		});
	});
});

describe('removePermission', () => {
	it('removes the grant, addressing the location by its numeric id like the other actions', async () => {
		const locals = testLocals();
		locals.services.locations.deleteLocationPermission.mockResolvedValue({} as LocationDto);

		await expect(act('removePermission', locals, { permission_id: ' 14 ' })).resolves.toEqual({
			action: 'removePermission',
			success: true,
			message: m.locations_permission_removed()
		});
		expect(locals.services.locations.deleteLocationPermission).toHaveBeenCalledWith(8, 14);
	});

	it('requires the permission id', async () => {
		const locals = testLocals();

		await expect(act('removePermission', locals, { permission_id: 'x' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.locations_permission_id_required() }
		});
		expect(locals.services.locations.deleteLocationPermission).not.toHaveBeenCalled();
	});

	it("reports a refusal with the API's message, or the fallback", async () => {
		const locals = testLocals();
		locals.services.locations.deleteLocationPermission.mockRejectedValue(
			apiError(403, 'Cannot remove the owner')
		);
		await expect(act('removePermission', locals, { permission_id: '14' })).resolves.toMatchObject({
			status: 403,
			data: { message: 'Cannot remove the owner' }
		});

		const offline = testLocals();
		offline.services.locations.deleteLocationPermission.mockRejectedValue(offlineError());
		await expect(act('removePermission', offline, { permission_id: '14' })).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_permission_remove_failed() }
		});
	});
});

describe('deleteLocation', () => {
	const CONFIRMED = { confirmLocationName: 'Greenhouse A', acknowledged: 'yes' };

	function named(name: unknown) {
		const locals = testLocals();
		locals.services.locations.getLocation.mockResolvedValue({ name } as LocationDto);
		return locals;
	}

	it('deletes location 8 after reading its real name, then redirects', async () => {
		const locals = named('Greenhouse A');
		locals.services.locations.deleteLocation.mockResolvedValue({ location_id: 8 });

		const thrown = await act('deleteLocation', locals, CONFIRMED).catch((error: unknown) => error);

		expect(isRedirect(thrown)).toBe(true);
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith(8);
		expect(locals.services.locations.deleteLocation).toHaveBeenCalledWith(8);
	});

	it('can never confirm a location without a name', async () => {
		const locals = named(null);

		await expect(
			act('deleteLocation', locals, { confirmLocationName: '', acknowledged: 'yes' })
		).resolves.toMatchObject({
			status: 400,
			data: { message: m.locations_delete_confirm_mismatch() }
		});
		expect(locals.services.locations.deleteLocation).not.toHaveBeenCalled();
	});

	it('reports a failed name lookup without deleting', async () => {
		const missing = testLocals();
		missing.services.locations.getLocation.mockRejectedValue(apiError(404, 'Location not found'));
		await expect(act('deleteLocation', missing, CONFIRMED)).resolves.toMatchObject({
			status: 404,
			data: { action: 'deleteLocation', message: 'Location not found' }
		});
		expect(missing.services.locations.deleteLocation).not.toHaveBeenCalled();

		const offline = testLocals();
		offline.services.locations.getLocation.mockRejectedValue(offlineError());
		await expect(act('deleteLocation', offline, CONFIRMED)).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_delete_rejected() }
		});
		expect(offline.services.locations.deleteLocation).not.toHaveBeenCalled();
	});

	it("reports other refusals with the API's message, or the fallback", async () => {
		const forbidden = named('Greenhouse A');
		forbidden.services.locations.deleteLocation.mockRejectedValue(
			apiError(403, 'Only the owner can delete it')
		);
		await expect(act('deleteLocation', forbidden, CONFIRMED)).resolves.toMatchObject({
			status: 403,
			data: { action: 'deleteLocation', message: 'Only the owner can delete it' }
		});

		const silent = named('Greenhouse A');
		silent.services.locations.deleteLocation.mockRejectedValue(silentApiError(500));
		await expect(act('deleteLocation', silent, CONFIRMED)).resolves.toMatchObject({
			status: 500,
			data: { message: m.locations_delete_rejected() }
		});

		const offline = named('Greenhouse A');
		offline.services.locations.deleteLocation.mockRejectedValue(offlineError());
		await expect(act('deleteLocation', offline, CONFIRMED)).resolves.toMatchObject({
			status: 502,
			data: { message: m.locations_delete_rejected() }
		});
	});
});
