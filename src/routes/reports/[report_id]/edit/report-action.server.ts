import { ApiServiceError } from '$lib/api/api.service';
import type {
	CreateReportAlertPointRequest,
	CreateReportDataProcessingScheduleRequest,
	CreateReportRecipientRequest,
	CreateReportRequest,
	CreateReportUserScheduleRequest
} from '$lib/api/api.dtos';

export type CurrentUser = {
	id: string;
	email: string;
	name: string;
};

export const REPORT_CREATED_SUCCESS_MESSAGE = 'Report created successfully.';
export const REPORT_UPDATED_SUCCESS_MESSAGE = 'Report updated successfully.';
export const REPORT_UPDATE_FAILED_MESSAGE = 'Failed to update report.';

export const readString = (value: unknown): string =>
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

const readOptionalPositiveInteger = (value: unknown): number | undefined => {
	const parsed = readOptionalInteger(value);
	return parsed !== undefined && parsed > 0 ? parsed : undefined;
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

export function readApiMessage(sourceError: unknown, fallback: string): string {
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

export function readReportId(payload: unknown): string | null {
	if (!isRecord(payload)) {
		return null;
	}

	const reportId = payload.report_id;
	if (typeof reportId === 'string' && reportId.trim()) {
		return reportId.trim();
	}

	for (const nestedKey of ['data', 'result']) {
		const nestedReportId = readReportId(payload[nestedKey]);
		if (nestedReportId) {
			return nestedReportId;
		}
	}

	return null;
}

export function readApiStatus(sourceError: unknown, fallback = 500): number {
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

export function parsePayload(
	formData: FormData
): { raw: string; value: Record<string, unknown> } | null {
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
				end_of_day: readOptionalBoolean(entry.end_of_day, false) ?? false,
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

function sanitizeDataProcessingScheduleEntries(
	value: unknown,
	defaults: { report_id?: string }
): CreateReportDataProcessingScheduleRequest[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const timePattern = /^(\d{2}:\d{2})(?::\d{2})?$/;
	const normalizeTime = (time: unknown): string | undefined => {
		if (typeof time !== 'string') return undefined;
		const match = timePattern.exec(time.trim());
		return match ? match[1] : undefined;
	};

	const entries = value
		.filter(isRecord)
		.map((entry) => {
			const dayOfWeek = readOptionalInteger(entry.day_of_week);
			const startTime = normalizeTime(entry.start_time);
			const endTime = normalizeTime(entry.end_time);

			if (dayOfWeek === undefined || !startTime || !endTime) {
				return null;
			}

			const schedule: CreateReportDataProcessingScheduleRequest = {
				day_of_week: dayOfWeek,
				start_time: startTime,
				end_time: endTime
			};

			const crossesMidnight = readOptionalBoolean(entry.crosses_midnight);
			const id = readOptionalString(entry.id);
			const isEnabled = readOptionalBoolean(entry.is_enabled);
			const reportId = readOptionalString(entry.report_id) ?? defaults.report_id;
			const ruleType = readOptionalString(entry.rule_type);
			const timezone = readOptionalString(entry.timezone);

			if (crossesMidnight !== undefined) schedule.crosses_midnight = crossesMidnight;
			if (id) schedule.id = id;
			if (isEnabled !== undefined) schedule.is_enabled = isEnabled;
			if (reportId) schedule.report_id = reportId;
			if (ruleType) schedule.rule_type = ruleType;
			if (timezone) schedule.timezone = timezone;

			return schedule;
		})
		.filter((entry): entry is CreateReportDataProcessingScheduleRequest => entry !== null);

	return entries.length > 0 ? entries : undefined;
}

export function sanitizeReportPayload(
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
	const dataPullInterval = readOptionalPositiveInteger(payload.data_pull_interval);
	const id = readOptionalInteger(payload.id);

	if (createdAt) sanitized.created_at = createdAt;
	if (dataPullInterval !== undefined) sanitized.data_pull_interval = dataPullInterval;
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
	const reportDataProcessingSchedules = sanitizeDataProcessingScheduleEntries(
		payload.report_data_processing_schedules,
		{ report_id: reportId }
	);

	if (reportUserSchedule) sanitized.report_user_schedule = reportUserSchedule;
	if (reportAlertPoints) sanitized.report_alert_points = reportAlertPoints;
	if (reportRecipients) sanitized.report_recipients = reportRecipients;
	if (reportDataProcessingSchedules) {
		sanitized.report_data_processing_schedules = reportDataProcessingSchedules;
	}

	return sanitized;
}

export function readCurrentUser(locals: App.Locals): CurrentUser | null {
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
