import {
    ApiService,
    ApiServiceError,
    type CreateLocationOwnerRequest,
    type LocationOwnerDto,
    type UpdateLocationOwnerRequest
} from '$lib/api/api.service';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { permission } from 'process';

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

const readBoolean = (value: FormDataEntryValue | null): boolean => {
    if (typeof value !== 'string') return false;
    return value.trim().toLowerCase() === 'true';
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
            locationOwners: [] as LocationOwnerDto[]
        };
    }

    const apiService = new ApiService({
        fetchFn: fetch,
        authToken
    });

    const location = await apiService.getLocation(locationId).catch(() => null);

    return {
        locationId,
        locationName: String(location?.name ?? `Location ${locationId}`),
        locationOwners: (location?.cw_location_owners ?? []) as LocationOwnerDto[]
    };
};

export const actions: Actions = {
    updateLocationName: async ({ request, locals, fetch, params }) => {
        const authToken = locals.jwtString ?? null;
        if (!authToken) {
            return fail(401, {
                action: 'updateLocationName',
                message: 'You must be logged in to update location name.'
            });
        }

        const locationId = Number.parseInt(params.location_id ?? '', 10);
        if (!Number.isFinite(locationId)) {
            return fail(400, {
                action: 'updateLocationName',
                message: 'Invalid location id.'
            });
        }

        const formData = await request.formData();
        const newName = readString(formData.get('locationName'));

        if (!newName) {
            return fail(400, {
                action: 'updateLocationName',
                message: 'Location name cannot be empty.'
            });
        }

        const apiService = new ApiService({
            fetchFn: fetch,
            authToken
        });

        try {
            await apiService.updateLocation(locationId, { name: newName });

            return {
                action: 'updateLocationName',
                success: true,
                message: 'Location name updated.'
            };
        } catch (error) {
            return fail(error instanceof ApiServiceError ? error.status : 502, {
                action: 'updateLocationName',
                message: readErrorMessage(error, 'Unable to update location name.')
            });
        }
    },
    addPermission: async ({ request, locals, fetch, params }) => {
        const authToken = locals.jwtString ?? null;
        if (!authToken) {
            return fail(401, {
                action: 'addPermission',
                message: 'You must be logged in to manage location permissions.',
                values: EMPTY_ADD_VALUES
            });
        }

        const locationId = Number.parseInt(params.location_id ?? '', 10);
        if (!Number.isFinite(locationId)) {
            return fail(400, {
                action: 'addPermission',
                message: 'Invalid location id.',
                values: EMPTY_ADD_VALUES
            });
        }

        const formData = await request.formData();
        const values: AddPermissionFormValues = {
            newUserEmail: readString(formData.get('newUserEmail')),
            permission_level: Number.parseInt(readString(formData.get('permission_level')), 10) || 4,
            applyToAllDevices: readBoolean(formData.get('applyToAllDevices'))
        };

        const fieldErrors: Partial<Record<'newUserEmail' | 'userId', string>> = {};
        if (!values.newUserEmail) {
            fieldErrors.newUserEmail = 'User email is required.';
        } else if (!EMAIL_PATTERN.test(values.newUserEmail)) {
            fieldErrors.newUserEmail = 'Enter a valid email address.';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return fail(400, {
                action: 'addPermission',
                message: 'Please correct the highlighted fields.',
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
                message: 'Location permission created.',
                values: EMPTY_ADD_VALUES
            };
        } catch (error) {
            return fail(error instanceof ApiServiceError ? error.status : 502, {
                action: 'addPermission',
                message: readErrorMessage(error, 'Unable to create location permission.'),
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
                message: 'You must be logged in to manage location permissions.',
                values: EMPTY_EDIT_VALUES
            });
        }

        const locationId = Number.parseInt(params.location_id ?? '', 10);
        if (!Number.isFinite(locationId)) {
            return fail(400, {
                action: 'editPermission',
                message: 'Invalid location id.',
                values: EMPTY_EDIT_VALUES
            });
        }

        const formData = await request.formData();
        const values: EditPermissionFormValues = {
            ownerId: readString(formData.get('ownerId')),
            permissionId: readString(formData.get('permissionId')),
            userId: readString(formData.get('userId')),
            applyToAllDevices: readBoolean(formData.get('applyToAllDevices'))
        };

        const fieldErrors: Partial<Record<'ownerId' | 'userId', string>> = {};
        const ownerId = Number.parseInt(values.ownerId, 10);
        const permissionId = Number.parseInt(values.permissionId, 10);

        if (!Number.isFinite(ownerId)) {
            fieldErrors.ownerId = 'Select a permission to edit.';
        }

        if (!values.userId) {
            fieldErrors.userId = 'User ID is required.';
        }

        const adminUserId = typeof locals.jwt?.sub === 'string' ? locals.jwt.sub.trim() : '';
        if (!adminUserId) {
            return fail(400, {
                action: 'editPermission',
                message: 'Missing admin user id in current session.',
                values,
                fieldErrors
            });
        }

        if (Object.keys(fieldErrors).length > 0) {
            return fail(400, {
                action: 'editPermission',
                message: 'Please correct the highlighted fields.',
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
                message: 'Location permission updated.',
                values: EMPTY_EDIT_VALUES
            };
        } catch (error) {
            return fail(error instanceof ApiServiceError ? error.status : 502, {
                action: 'editPermission',
                message: readErrorMessage(error, 'Unable to update location permission.'),
                values,
                fieldErrors
            });
        }
    },
    removePermission: async ({ request, locals, fetch, params }) => {
        const authToken = locals.jwtString ?? null;
        if (!authToken) {
            return fail(401, {
                action: 'removePermission',
                message: 'You must be logged in to manage location permissions.',
                values: EMPTY_ADD_VALUES
            });
        }

        const formData = await request.formData();
        const permissionIdRaw = readString(formData.get('permission_id'));
        const permissionId = Number.parseInt(permissionIdRaw, 10);
        if (!Number.isFinite(permissionId)) {
            return fail(400, {
                action: 'removePermission',
                message: 'permission_id is required.'
            });
        }

        const apiService = new ApiService({
            fetchFn: fetch,
            authToken
        });

        try {
            const response = await apiService.deleteLocationPermission(params.location_id, permissionId);
            console.log('Delete permission response:', response);

            return {
                action: 'removePermission',
                success: true,
                message: 'Location permission removed.'
            };
        } catch (error) {
            return fail(error instanceof ApiServiceError ? error.status : 502, {
                action: 'removePermission',
                message: readErrorMessage(error, 'Unable to remove location permission.')
            });
        }

    },
};
