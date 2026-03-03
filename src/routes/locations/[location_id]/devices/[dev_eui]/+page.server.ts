import { PUBLIC_AIR_NOTES_ENDPOINT, PUBLIC_API_BASE_URL } from '$env/static/public';
import { type PaginationQuery, ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from '$types';
import { type Actions, fail } from '@sveltejs/kit';


export const load: PageServerLoad = async ({ params, locals }) => {
    const authToken = locals.jwtString ?? null;
    const locationId = Number.parseInt(params.location_id, 10);

    if (!authToken || !Number.isFinite(locationId)) {
        return {
            allLocationDevices: []
        };
    }

    const apiServiceInstance = new ApiService({
        fetchFn: fetch,
        authToken
    });

    const pagination: PaginationQuery = {
        skip: 0,
        take: 144
    }

    const deviceData = await apiServiceInstance.getDeviceData(params.dev_eui, pagination);
    const latestData = await apiServiceInstance.getDeviceLatestData(params.dev_eui);
    const dataTable = await apiServiceInstance.getDevice(params.dev_eui);

    const deviceDataTable = dataTable.cw_device_type.data_table_v2;


    return {
        deviceData: deviceData ?? [],
        latestData: latestData ?? null,
        dataTable: deviceDataTable,
    };
};

export const actions: Actions = {
    saveDataNote: async ({ request, cookies, fetch }) => {
        const data = await request.formData();
        const noteContent = data.get('note')?.toString() ?? '';
        const telemetryId = data.get('created_at')?.toString() ?? '';
        const devEui = data.get('dev_eui')?.toString() ?? '';

        const endpoint = `${PUBLIC_API_BASE_URL}${PUBLIC_AIR_NOTES_ENDPOINT}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                note: noteContent,
                created_at: telemetryId,
                dev_eui: devEui
            })
        });
        if (!response.ok) {
            const responsePayload = await parseResponseBody(response);
            return fail(response.status, {
                action: 'saveDataNote',
                message: readApiError(responsePayload, 'Unable to save note.')
            });
        }

        return {
            success: true,
            message: 'Note saved successfully.'
        };
    }
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

const readApiError = (payload: unknown, fallback: string): string => {
    if (isRecord(payload)) {
        const message = payload.message;
        if (Array.isArray(message)) {
            const fromArray = message.map(asString).filter(Boolean).join(', ');
            if (fromArray.length > 0) return fromArray;
        }
        const fromField = asString(message);
        if (fromField) return fromField;
    }
    return fallback;
};