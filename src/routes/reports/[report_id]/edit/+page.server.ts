import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type {
	CreateReportAlertPointRequest,
	CreateReportRecipientRequest,
	CreateReportRequest,
	CreateReportUserScheduleRequest
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type CurrentUser = {
	id: string;
	email: string;
	name: string;
};

const REPORT_UPDATED_SUCCESS_MESSAGE = 'Report updated successfully.';
const REPORT_UPDATE_FAILED_MESSAGE = 'Failed to update report.';

const readString = (value: unknown): string =>
	typeof value === 'string'
		? value.trim()
		: typeof value === 'number' && Number.isFinite(value)
			? String(value)
			: '';

const readOptionalString = (value: unknown): string | undefined => {
	const normalized = readString(value);
	return normalized.length > 0 ? normalized : undefined;
};

const readOptionalInteger = (value: unknown): number | undefined => {
	if (typeof value === 'number' && Number.isInteger(value)) {
		return value;
	}

	const normalized = readString(value);
	if (!normalized) return undefined;

	const parsed = Number.parseInt(normalized, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const readOptionalNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	const normalized = readString(value);
	if (!normalized) return undefined;

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const readOptionalBoolean = (value: unknown, fallback?: boolean): boolean | undefined => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}

	return fallback;
};

const normalizeDevEui = (value: string): string =>
	value
		.replace(/[^0-9a-fA-F]/g, '')
		.toUpperCase()
		.slice(0, 16);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function readApiMessage(sourceError: unknown, fallback: string): string {
	if (sourceError instanceof ApiServiceError) {
		const payload = sourceError.payload as { payload?: { message?: unknown } } | null;
		const message = payload?.payload?.message;

		if (typeof message === 'string' && message.trim()) {
			return message.trim();
		}

		if (Array.isArray(message)) {
			const text = message
				.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
				.join(', ');

			if (text) return text;
		}
	}

	if (sourceError instanceof Error && sourceError.message.trim()) {
		return sourceError.message.trim();
	}

	return fallback;
}

function readApiStatus(sourceError: unknown, fallback = 500): number {
	if (
		sourceError instanceof ApiServiceError &&
		Number.isInteger(sourceError.status) &&
		sourceError.status >= 400 &&
		sourceError.status < 600
	) {
		return sourceError.status;
	}

	return fallback;
}

function parsePayload(formData: FormData): { raw: string; value: Record<string, unknown> } | null {
	const raw = readString(formData.get('payload'));
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isRecord(parsed)) {
			return null;
		}

		return { raw, value: parsed };
	} catch {
		return null;
	}
}

function sanitizeScheduleEntries(
	value: unknown,
	defaults: {
		dev_eui: string;
		report_id?: string;
		user_id?: string;
	}
): CreateReportUserScheduleRequest[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const schedules = value
		.filter(isRecord)
		.map((entry) => {
			const devEuiSource = readOptionalString(entry.dev_eui);
			const devEui = normalizeDevEui(devEuiSource ?? defaults.dev_eui);
			if (!devEui) {
				return null;
			}

			const schedule: CreateReportUserScheduleRequest = {
				dev_eui: devEui,
				end_of_month: readOptionalBoolean(entry.end_of_month, false) ?? false,
				end_of_week: readOptionalBoolean(entry.end_of_week, false) ?? false,
				is_active: readOptionalBoolean(entry.is_active, true) ?? true
			};

			const createdAt = readOptionalString(entry.created_at);
			const id = readOptionalInteger(entry.id);
			const reportId = readOptionalString(entry.report_id) ?? defaults.report_id;
			const reportUserScheduleId = readOptionalInteger(entry.report_user_schedule_id);
			const userId = readOptionalString(entry.user_id) ?? defaults.user_id;

			if (createdAt) schedule.created_at = createdAt;
			if (id !== undefined) schedule.id = id;
			if (reportId) schedule.report_id = reportId;
			if (reportUserScheduleId !== undefined) {
				schedule.report_user_schedule_id = reportUserScheduleId;
			}
			if (userId) schedule.user_id = userId;

			return schedule;
		})
		.filter((entry): entry is CreateReportUserScheduleRequest => entry !== null);

	return schedules.length > 0 ? schedules : undefined;
}

function sanitizeAlertEntries(
	value: unknown,
	defaults: {
		report_id?: string;
		user_id?: string;
	}
): CreateReportAlertPointRequest[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const alerts = value
		.filter(isRecord)
		.map((entry) => {
			const name = readOptionalString(entry.name);
			const dataPointKey = readOptionalString(entry.data_point_key);

			if (!name || !dataPointKey) {
				return null;
			}

			const alert: CreateReportAlertPointRequest = {
				name,
				data_point_key: dataPointKey
			};

			const createdAt = readOptionalString(entry.created_at);
			const hexColor = readOptionalString(entry.hex_color);
			const id = readOptionalInteger(entry.id);
			const max = readOptionalNumber(entry.max);
			const min = readOptionalNumber(entry.min);
			const operator = readOptionalString(entry.operator);
			const reportId = readOptionalString(entry.report_id) ?? defaults.report_id;
			const userId = readOptionalString(entry.user_id) ?? defaults.user_id;
			const valueNumber = readOptionalNumber(entry.value);

			if (createdAt) alert.created_at = createdAt;
			if (hexColor) alert.hex_color = hexColor;
			if (id !== undefined) alert.id = id;
			if (max !== undefined) alert.max = max;
			if (min !== undefined) alert.min = min;
			if (operator) alert.operator = operator;
			if (reportId) alert.report_id = reportId;
			if (userId) alert.user_id = userId;
			if (valueNumber !== undefined) alert.value = valueNumber;

			return alert;
		})
		.filter((entry): entry is CreateReportAlertPointRequest => entry !== null);

	return alerts.length > 0 ? alerts : undefined;
}

function sanitizeRecipientEntries(
	value: unknown,
	defaults: {
		report_id?: string;
		user_id?: string;
	}
): CreateReportRecipientRequest[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const recipients = value
		.filter(isRecord)
		.map((entry) => {
			const communicationMethod = readOptionalInteger(entry.communication_method);
			const email = readOptionalString(entry.email);
			const name = readOptionalString(entry.name);
			const userId = readOptionalString(entry.user_id) ?? defaults.user_id;

			if (!communicationMethod || (!email && !userId)) {
				return null;
			}

			const recipient: CreateReportRecipientRequest = {
				communication_method: communicationMethod
			};

			const createdAt = readOptionalString(entry.created_at);
			const id = readOptionalInteger(entry.id);
			const reportId = readOptionalString(entry.report_id) ?? defaults.report_id;

			if (createdAt) recipient.created_at = createdAt;
			if (email) recipient.email = email;
			if (id !== undefined) recipient.id = id;
			if (name) recipient.name = name;
			if (reportId) recipient.report_id = reportId;
			if (userId) recipient.user_id = userId;

			return recipient;
		})
		.filter((entry): entry is CreateReportRecipientRequest => entry !== null);

	return recipients.length > 0 ? recipients : undefined;
}

function sanitizeReportPayload(
	payload: Record<string, unknown>,
	defaults: {
		report_id?: string;
		user_id?: string;
	}
): CreateReportRequest {
	const name = readString(payload.name);
	const devEui = normalizeDevEui(readString(payload.dev_eui));
	const reportId = readOptionalString(payload.report_id) ?? defaults.report_id;
	const userId = readOptionalString(payload.user_id) ?? defaults.user_id;

	const sanitized: CreateReportRequest = {
		name,
		dev_eui: devEui
	};

	const createdAt = readOptionalString(payload.created_at);
	const id = readOptionalInteger(payload.id);

	if (createdAt) sanitized.created_at = createdAt;
	if (id !== undefined) sanitized.id = id;
	if (reportId) sanitized.report_id = reportId;
	if (userId) sanitized.user_id = userId;

	const reportUserSchedule = sanitizeScheduleEntries(payload.report_user_schedule, {
		dev_eui: devEui,
		report_id: reportId,
		user_id: userId
	});
	const reportAlertPoints = sanitizeAlertEntries(payload.report_alert_points, {
		report_id: reportId,
		user_id: userId
	});
	const reportRecipients = sanitizeRecipientEntries(payload.report_recipients, {
		report_id: reportId,
		user_id: userId
	});

	if (reportUserSchedule) sanitized.report_user_schedule = reportUserSchedule;
	if (reportAlertPoints) sanitized.report_alert_points = reportAlertPoints;
	if (reportRecipients) sanitized.report_recipients = reportRecipients;

	return sanitized;
}

function readCurrentUser(locals: App.Locals): CurrentUser | null {
	const jwt = locals.jwt;
	const id = jwt?.sub?.trim();
	if (!jwt || !id) {
		return null;
	}

	const email = jwt.user_metadata?.email?.trim() || jwt.email?.trim() || '';
	const name =
		jwt.user_metadata?.full_name?.trim() || jwt.user_metadata?.name?.trim() || email || id;

	return { id, email, name };
}

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const reportId = readString(params.report_id);
	const currentUser = readCurrentUser(locals);

	if (!authToken) {
		error(401, m.error_unauthorized_title());
	}

	if (!reportId) {
		error(404, m.error_not_found_title());
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	try {
		const [report, devices] = await Promise.all([
			api.getReport(reportId),
			api.getAllDevices().catch(() => [])
		]);

		return {
			authToken,
			currentUser,
			devices,
			report
		};
	} catch (sourceError) {
		const status = readApiStatus(sourceError);
		const fallback = status === 404 ? m.error_not_found_title() : REPORT_UPDATE_FAILED_MESSAGE;
		error(status, readApiMessage(sourceError, fallback));
	}
};

export const actions: Actions = {
	default: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const reportId = readString(params.report_id);
		const currentUser = readCurrentUser(locals);

		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		if (!reportId) {
			return fail(404, { error: m.error_not_found_title() });
		}

		const parsedPayload = parsePayload(await request.formData());
		if (!parsedPayload) {
			return fail(400, {
				error: m.reports_create_payload_unreadable()
			});
		}

		const sanitizedPayload = sanitizeReportPayload(parsedPayload.value, {
			report_id: reportId,
			user_id: currentUser?.id
		});

		if (!sanitizedPayload.name) {
			return fail(400, {
				error: m.validation_name_required(),
				payload: parsedPayload.raw
			});
		}

		if (!sanitizedPayload.dev_eui) {
			return fail(400, {
				error: m.devices_dev_eui_required(),
				payload: parsedPayload.raw
			});
		}

		if (sanitizedPayload.dev_eui.length !== 16) {
			return fail(400, {
				error: m.devices_dev_eui_invalid(),
				payload: parsedPayload.raw
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await api.updateReport(reportId, sanitizedPayload);

			return {
				success: true,
				message: REPORT_UPDATED_SUCCESS_MESSAGE,
				report_id: reportId
			};
		} catch (sourceError) {
			const message = readApiMessage(sourceError, REPORT_UPDATE_FAILED_MESSAGE);
			const status = readApiStatus(sourceError);

			return fail(status, {
				error: message,
				payload: parsedPayload.raw
			});
		}
	}
};
