import {
	ApiService,
	ApiServiceError,
	type CreateLocationOwnerRequest,
	type LocationOwnerDto,
	type UpdateLocationOwnerRequest
} from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AddPermissionFormValues = {
	newUserEmail: string;
	userId?: string;
	permission_level: number;
	applyToAllDevices: boolean;
};

type EditPermissionFormValues = {
	ownerId: string;
	permissionId: string;
	userId?: string;
	applyToAllDevices: boolean;
};

const EMPTY_ADD_VALUES: AddPermissionFormValues = {
	newUserEmail: '',
	userId: '',
	permission_level: 4,
	applyToAllDevices: false
};

const EMPTY_EDIT_VALUES: EditPermissionFormValues = {
	ownerId: '',
	permissionId: '',
	userId: '',
	applyToAllDevices: false
};

const readString = (value: FormDataEntryValue | null): string => {
	if (typeof value !== 'string') return '';
	return value.trim();
};

const readUnknownString = (value: unknown): string => {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
};

const readErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof ApiServiceError) {
		const payload = error.payload;
		if (payload && typeof payload === 'object') {
			const record = payload as Record<string, unknown>;
			const message = record.message;
			if (Array.isArray(message)) {
				const combined = message
					.filter((entry): entry is string => typeof entry === 'string')
					.join(', ');
				if (combined.length > 0) return combined;
			}
			if (typeof message === 'string' && message.trim().length > 0) return message.trim();
		}
	}

	return fallback;
};

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const locationId = Number.parseInt(params.location_id ?? '', 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			locationId: Number.isFinite(locationId) ? locationId : null,
			locationName: '',
			locationGroup: '',
			locationOwners: [] as LocationOwnerDto[]
		};
	}

	const apiService = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const location = await apiService.getLocation(locationId).catch(() => null);
	const currentUserId = readUnknownString(locals.jwt?.sub);
	const locationOwnerId = readUnknownString((location as Record<string, unknown> | null)?.owner_id);

	if (locationOwnerId !== currentUserId) {
		const owner = location?.cw_location_owners?.find(
			(owner) =>
				readUnknownString(owner.user_id) === currentUserId &&
				readUnknownString(owner.permission_level) === '1'
		);
		if (!owner) {
			throw fail(403, {
				message: m.locations_permission_denied()
			});
		}
	}

	return {
		locationId,
		locationName: String(location?.name ?? `Location ${locationId}`),
		locationGroup: String(location?.group ?? ''),
		locationOwners: (location?.cw_location_owners ?? []) as LocationOwnerDto[]
	};
};

export const actions: Actions = {
	updateLocationName: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, {
				action: 'updateLocationName',
				message: m.locations_update_name_requires_login()
			});
		}

		const locationId = Number.parseInt(params.location_id ?? '', 10);
		if (!Number.isFinite(locationId)) {
			return fail(400, {
				action: 'updateLocationName',
				message: m.locations_invalid_location_id()
			});
		}

		const formData = await request.formData();
		const newName = readString(formData.get('locationName'));
		const newGroup = readString(formData.get('group'));

		if (!newName) {
			return fail(400, {
				action: 'updateLocationName',
				message: m.locations_name_cannot_be_empty()
			});
		}

		const apiService = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await apiService.updateLocation(locationId, { name: newName, group: newGroup });

			return {
				action: 'updateLocationName',
				success: true,
				message: m.locations_name_updated()
			};
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateLocationName',
				message: readErrorMessage(error, m.locations_update_name_failed())
			});
		}
	},
	addPermission: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, {
				action: 'addPermission',
				message: m.locations_manage_permissions_requires_login(),
				values: EMPTY_ADD_VALUES
			});
		}

		const locationId = Number.parseInt(params.location_id ?? '', 10);
		if (!Number.isFinite(locationId)) {
			return fail(400, {
				action: 'addPermission',
				message: m.locations_invalid_location_id(),
				values: EMPTY_ADD_VALUES
			});
		}

		const formData = await request.formData();
		const values: AddPermissionFormValues = {
			newUserEmail: readString(formData.get('newUserEmail')),
			permission_level: Number.parseInt(readString(formData.get('permission_level')), 10) || 4,
			applyToAllDevices: formData.get('applyToAllDevices') === 'true'
		};

		const fieldErrors: Partial<Record<'newUserEmail' | 'userId', string>> = {};
		if (!values.newUserEmail) {
			fieldErrors.newUserEmail = m.validation_user_email_required();
		} else if (!EMAIL_PATTERN.test(values.newUserEmail)) {
			fieldErrors.newUserEmail = m.validation_valid_email_required();
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'addPermission',
				message: m.validation_correct_highlighted_fields(),
				values,
				fieldErrors
			});
		}

		const apiService = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await apiService.createLocationPermission(
				locationId,
				values.newUserEmail,
				values.permission_level ?? 4,
				values.applyToAllDevices
			);

			return {
				action: 'addPermission',
				success: true,
				message: m.locations_permission_created(),
				values: EMPTY_ADD_VALUES
			};
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'addPermission',
				message: readErrorMessage(error, m.locations_permission_create_failed()),
				values,
				fieldErrors
			});
		}
	},
	editPermission: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, {
				action: 'editPermission',
				message: m.locations_manage_permissions_requires_login(),
				values: EMPTY_EDIT_VALUES
			});
		}

		const locationId = Number.parseInt(params.location_id ?? '', 10);
		if (!Number.isFinite(locationId)) {
			return fail(400, {
				action: 'editPermission',
				message: m.locations_invalid_location_id(),
				values: EMPTY_EDIT_VALUES
			});
		}

		const formData = await request.formData();
		const values: EditPermissionFormValues = {
			ownerId: readString(formData.get('ownerId')),
			permissionId: readString(formData.get('permissionId')),
			userId: readString(formData.get('userId')),
			applyToAllDevices: formData.get('applyToAllDevices') === 'true'
		};

		const fieldErrors: Partial<Record<'ownerId' | 'userId', string>> = {};
		const ownerId = Number.parseInt(values.ownerId, 10);
		const permissionId = Number.parseInt(values.permissionId, 10);

		if (!Number.isFinite(ownerId)) {
			fieldErrors.ownerId = m.locations_select_permission_to_edit();
		}

		if (!values.userId) {
			fieldErrors.userId = m.locations_user_id_required();
		}

		const adminUserId = typeof locals.jwt?.sub === 'string' ? locals.jwt.sub.trim() : '';
		if (!adminUserId) {
			return fail(400, {
				action: 'editPermission',
				message: m.locations_missing_admin_user_id(),
				values,
				fieldErrors
			});
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'editPermission',
				message: m.validation_correct_highlighted_fields(),
				values,
				fieldErrors
			});
		}

		const updateLocationOwnerPayload: UpdateLocationOwnerRequest = {
			admin_user_id: adminUserId,
			location_id: locationId,
			user_id: values.userId,
			owner_id: ownerId
		};
		if (Number.isFinite(permissionId)) {
			updateLocationOwnerPayload.id = permissionId;
		}

		const apiService = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await apiService.updateLocationPermission(
				locationId,
				updateLocationOwnerPayload,
				values.applyToAllDevices
			);

			return {
				action: 'editPermission',
				success: true,
				message: m.locations_permission_updated(),
				values: EMPTY_EDIT_VALUES
			};
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'editPermission',
				message: readErrorMessage(error, m.locations_permission_update_failed()),
				values,
				fieldErrors
			});
		}
	},
	updateUserPermissionLevel: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, {
				action: 'updateUserPermissionLevel',
				message: m.locations_manage_permissions_requires_login()
			});
		}

		const locationId = Number.parseInt(params.location_id ?? '', 10);
		if (!Number.isFinite(locationId)) {
			return fail(400, {
				action: 'updateUserPermissionLevel',
				message: m.locations_invalid_location_id()
			});
		}

		const formData = await request.formData();
		const permissionLevel = readString(formData.get('permission_level'));
		const email = readString(formData.get('email'));

		if (!email) {
			return fail(400, {
				action: 'updateUserPermissionLevel',
				message: m.validation_email_required()
			});
		}

		if (!permissionLevel) {
			return fail(400, {
				action: 'updateUserPermissionLevel',
				message: m.locations_permission_level_required()
			});
		}

		const apiService = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await apiService.updateLocationPermissionLevel(locationId, email, +permissionLevel);

			return {
				action: 'updateUserPermissionLevel',
				success: true,
				message: m.locations_user_permission_level_updated()
			};
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateUserPermissionLevel',
				message: readErrorMessage(error, m.locations_user_permission_level_update_failed())
			});
		}
	},
	removePermission: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, {
				action: 'removePermission',
				message: m.locations_manage_permissions_requires_login(),
				values: EMPTY_ADD_VALUES
			});
		}

		const locationId = readUnknownString(params.location_id);
		if (!locationId) {
			return fail(400, {
				action: 'removePermission',
				message: m.locations_invalid_location_id()
			});
		}

		const formData = await request.formData();
		const permissionIdRaw = readString(formData.get('permission_id'));
		const permissionId = Number.parseInt(permissionIdRaw, 10);
		if (!Number.isFinite(permissionId)) {
			return fail(400, {
				action: 'removePermission',
				message: m.locations_permission_id_required()
			});
		}

		const apiService = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			const response = await apiService.deleteLocationPermission(locationId, permissionId);
			console.log('Delete permission response:', response);

			return {
				action: 'removePermission',
				success: true,
				message: m.locations_permission_removed()
			};
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'removePermission',
				message: readErrorMessage(error, m.locations_permission_remove_failed())
			});
		}
	}
};
