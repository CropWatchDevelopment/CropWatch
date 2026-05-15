import type {
	CreateReportAlertPointRequest,
	CreateReportDataProcessingScheduleRequest,
	CreateReportRecipientRequest,
	CreateReportRequest,
	CreateReportUserScheduleRequest,
	ReportDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import type { CwAlertPointCondition, CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
import {
	DEFAULT_REPORT_DATA_PULL_INTERVAL,
	normalizeReportDataPullInterval,
	parseReportDataPullInterval
} from './data-pull-interval';
import type {
	DataProcessingScheduleDraft,
	RecipientDraft,
	ReportDraft,
	ScheduleDraft
} from './report-form.types';

export type CurrentUser = {
	email: string;
	id: string;
	name: string;
} | null;

type ReportDraftFactoryOptions = {
	currentUser: CurrentUser;
	initialDevEui?: string | null;
	nextRowKey: (prefix: string) => string;
	report: ReportDto | null;
};

const DEFAULT_ALERT_COLOR = '';
const DEFAULT_ALERT_DATA_POINT_KEY = 'temperature_c';

export function normalizeDevEui(value: string): string {
	return value
		.replace(/[^0-9a-fA-F]/g, '')
		.toUpperCase()
		.slice(0, 16);
}

export function cleanOptional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function parseOptionalInteger(value: string): number | undefined {
	const normalized = cleanOptional(value);
	if (!normalized) return undefined;

	const parsed = Number.parseInt(normalized, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseOptionalNumber(value: string): number | undefined {
	const normalized = cleanOptional(value);
	if (!normalized) return undefined;

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function preventImplicitFormSubmission(node: HTMLFormElement) {
	function normalizeButtonTypes() {
		for (const button of node.querySelectorAll<HTMLButtonElement>('button:not([type])')) {
			button.type = 'button';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.defaultPrevented) return;

		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target instanceof HTMLButtonElement) return;
		if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
		if (target instanceof HTMLInputElement) {
			if (['button', 'checkbox', 'file', 'radio', 'reset', 'submit'].includes(target.type)) {
				return;
			}
		}

		event.preventDefault();
	}

	normalizeButtonTypes();

	const observer = new MutationObserver(() => {
		normalizeButtonTypes();
	});

	observer.observe(node, { childList: true, subtree: true });
	node.addEventListener('keydown', handleKeydown);

	return () => {
		observer.disconnect();
		node.removeEventListener('keydown', handleKeydown);
	};
}

export function createEmptyAlertPointsValue(): CwAlertPointsValue {
	return {
		unit: 'C',
		center: '0',
		points: []
	};
}

function mapAlertConditionToOperator(condition: CwAlertPointCondition): string {
	switch (condition) {
		case 'greaterThan':
			return '>';
		case 'greaterThanOrEqual':
			return '>=';
		case 'lessThan':
			return '<';
		case 'lessThanOrEqual':
			return '<=';
		case 'range':
			return 'range';
		case 'equals':
		default:
			return '=';
	}
}

function mapOperatorToAlertCondition(operator: string | null | undefined): CwAlertPointCondition {
	switch (operator) {
		case '>':
			return 'greaterThan';
		case '>=':
			return 'greaterThanOrEqual';
		case '<':
			return 'lessThan';
		case '<=':
			return 'lessThanOrEqual';
		case 'range':
			return 'range';
		case '=':
		default:
			return 'equals';
	}
}

export function createReportDraftFactory({
	currentUser,
	initialDevEui = '',
	nextRowKey,
	report
}: ReportDraftFactoryOptions) {
	function createEmptySchedule(rootUserId = currentUser?.id ?? ''): ScheduleDraft {
		return {
			created_at: '',
			dev_eui: '',
			end_of_day: false,
			end_of_week: true,
			id: '',
			is_active: true,
			key: nextRowKey('schedule'),
			report_id: report?.report_id ?? '',
			report_user_schedule_id: '',
			user_id: rootUserId
		};
	}

	function createEmptyDataProcessingSchedule(): DataProcessingScheduleDraft {
		return {
			crosses_midnight: false,
			day_of_week: '1',
			end_time: '17:00',
			id: '',
			is_enabled: true,
			key: nextRowKey('dps'),
			report_id: report?.report_id ?? '',
			rule_type: 'include',
			start_time: '09:00',
			timezone: 'JST'
		};
	}

	function createEmptyRecipient(rootUserId = currentUser?.id ?? ''): RecipientDraft {
		return {
			communication_method: '1',
			created_at: '',
			email: currentUser?.email ?? '',
			id: '',
			key: nextRowKey('recipient'),
			name: currentUser?.name ?? '',
			report_id: report?.report_id ?? '',
			user_id: rootUserId
		};
	}

	function buildDefaultDraft(): ReportDraft {
		return {
			created_at: '',
			data_pull_interval: DEFAULT_REPORT_DATA_PULL_INTERVAL,
			dev_eui: normalizeDevEui(initialDevEui ?? ''),
			id: '',
			name: '',
			report_id: '',
			report_data_processing_schedules: [],
			report_recipients: [createEmptyRecipient()],
			report_user_schedule: [createEmptySchedule()],
			user_id: currentUser?.id ?? ''
		};
	}

	function buildDraftFromReport(source: ReportDto): ReportDraft {
		const normalizedReportDevEui = normalizeDevEui(source.dev_eui ?? '');
		const rootUserId = cleanOptional(source.user_id ?? '') ?? currentUser?.id ?? '';
		const reportId = source.report_id ?? '';

		const schedules =
			source.report_user_schedule?.map((schedule) => {
				const scheduleDevEui = normalizeDevEui(schedule.dev_eui ?? '');

				return {
					created_at: schedule.created_at ?? '',
					dev_eui: scheduleDevEui === normalizedReportDevEui ? '' : scheduleDevEui,
					end_of_day: schedule.end_of_day ?? false,
					end_of_week: schedule.end_of_week ?? false,
					id: schedule.id != null ? String(schedule.id) : '',
					is_active: schedule.is_active ?? true,
					key: nextRowKey('schedule'),
					report_id: cleanOptional(schedule.report_id ?? '') ?? reportId,
					report_user_schedule_id:
						schedule.report_user_schedule_id != null
							? String(schedule.report_user_schedule_id)
							: '',
					user_id: cleanOptional(schedule.user_id ?? '') ?? rootUserId
				};
			}) ?? [];

		const recipients =
			source.report_recipients?.map((recipient) => ({
				communication_method:
					recipient.communication_method != null ? String(recipient.communication_method) : '1',
				created_at: recipient.created_at ?? '',
				email: recipient.email ?? '',
				id: recipient.id != null ? String(recipient.id) : '',
				key: nextRowKey('recipient'),
				name: recipient.name ?? '',
				report_id: cleanOptional(recipient.report_id ?? '') ?? reportId,
				user_id: cleanOptional(recipient.user_id ?? '') ?? rootUserId
			})) ?? [];

		const dataProcessingSchedules =
			source.report_data_processing_schedules?.map((schedule) => ({
				crosses_midnight: schedule.crosses_midnight ?? false,
				day_of_week: schedule.day_of_week != null ? String(schedule.day_of_week) : '1',
				end_time: schedule.end_time ?? '17:00',
				id: schedule.id ?? '',
				is_enabled: schedule.is_enabled ?? true,
				key: nextRowKey('dps'),
				report_id: schedule.report_id ?? reportId,
				rule_type: schedule.rule_type ?? 'include',
				start_time: schedule.start_time ?? '09:00',
				timezone: schedule.timezone ?? 'UTC'
			})) ?? [];

		return {
			created_at: source.created_at ?? '',
			data_pull_interval: normalizeReportDataPullInterval(source.data_pull_interval),
			dev_eui: normalizedReportDevEui,
			id: source.id != null ? String(source.id) : '',
			name: source.name ?? '',
			report_id: reportId,
			report_data_processing_schedules: dataProcessingSchedules,
			report_recipients: recipients.length > 0 ? recipients : [createEmptyRecipient(rootUserId)],
			report_user_schedule: schedules.length > 0 ? schedules : [createEmptySchedule(rootUserId)],
			user_id: rootUserId
		};
	}

	function buildAlertPointsValueFromReport(source: ReportDto): CwAlertPointsValue {
		const baseValue = createEmptyAlertPointsValue();
		const points =
			source.report_alert_points?.map((point, index) => {
				const condition =
					typeof point.operator === 'string' && point.operator.trim().length > 0
						? mapOperatorToAlertCondition(point.operator)
						: point.min != null || point.max != null
							? 'range'
							: 'equals';
				const fallbackId = point.id != null ? String(point.id) : nextRowKey(`alert-${index + 1}`);

				return {
					color: cleanOptional(point.hex_color ?? '')?.toUpperCase() ?? DEFAULT_ALERT_COLOR,
					condition,
					id: fallbackId,
					max: point.max != null ? String(point.max) : '',
					min: point.min != null ? String(point.min) : '',
					name: point.name ?? '',
					value: point.value != null ? String(point.value) : ''
				};
			}) ?? [];

		return { ...baseValue, points };
	}

	return {
		buildAlertPointsValueFromReport,
		buildDefaultDraft,
		buildDraftFromReport,
		createEmptyDataProcessingSchedule,
		createEmptyRecipient
	};
}

function buildReportAlertPoints(
	alertPoints: CwAlertPointsValue,
	defaults: {
		reportId?: string;
		userId?: string;
	}
): CreateReportAlertPointRequest[] {
	return alertPoints.points.map((point) => {
		const alertPayload: CreateReportAlertPointRequest = {
			data_point_key: DEFAULT_ALERT_DATA_POINT_KEY,
			name: point.name.trim()
		};

		if (point.id !== undefined && point.id !== null && point.id !== '') {
			const parsedId = Number(point.id);
			if (!isNaN(parsedId)) {
				alertPayload.id = parsedId;
			}
		}

		const alertHexColor = cleanOptional(point.color)?.toUpperCase();
		const alertMax = parseOptionalNumber(point.max);
		const alertMin = parseOptionalNumber(point.min);
		const alertOperator = cleanOptional(mapAlertConditionToOperator(point.condition));
		const alertValue = parseOptionalNumber(point.value);

		if (alertHexColor) alertPayload.hex_color = alertHexColor;
		if (alertMax !== undefined) alertPayload.max = alertMax;
		if (alertMin !== undefined) alertPayload.min = alertMin;
		if (alertOperator) alertPayload.operator = alertOperator;
		if (defaults.reportId) alertPayload.report_id = defaults.reportId;
		if (defaults.userId) alertPayload.user_id = defaults.userId;
		if (alertValue !== undefined) alertPayload.value = alertValue;

		return alertPayload;
	});
}

export function buildRequestPayload(
	draft: ReportDraft,
	rootDevEui: string,
	alertPoints: CwAlertPointsValue,
	currentUser: CurrentUser
): CreateReportRequest {
	const createdAt = cleanOptional(draft.created_at);
	const id = parseOptionalInteger(draft.id);
	const reportId = cleanOptional(draft.report_id);
	const userId = cleanOptional(draft.user_id) ?? currentUser?.id ?? undefined;
	const devEui = normalizeDevEui(rootDevEui);
	const dataPullInterval = parseReportDataPullInterval(draft.data_pull_interval);

	const reportUserSchedule: CreateReportUserScheduleRequest[] = draft.report_user_schedule.map(
		(schedule) => {
			const schedulePayload: CreateReportUserScheduleRequest = {
				dev_eui: normalizeDevEui(schedule.dev_eui) || devEui,
				end_of_day: schedule.end_of_day,
				end_of_week: schedule.end_of_week,
				is_active: schedule.is_active
			};

			const scheduleCreatedAt = cleanOptional(schedule.created_at);
			const scheduleId = parseOptionalInteger(schedule.id);
			const scheduleReportId = cleanOptional(schedule.report_id) ?? reportId;
			const scheduleRowId = parseOptionalInteger(schedule.report_user_schedule_id);
			const scheduleUserId = cleanOptional(schedule.user_id) ?? userId;

			if (scheduleCreatedAt) schedulePayload.created_at = scheduleCreatedAt;
			if (scheduleId !== undefined) schedulePayload.id = scheduleId;
			if (scheduleReportId) schedulePayload.report_id = scheduleReportId;
			if (scheduleRowId !== undefined) schedulePayload.report_user_schedule_id = scheduleRowId;
			if (scheduleUserId) schedulePayload.user_id = scheduleUserId;

			return schedulePayload;
		}
	);

	const reportAlertPoints = buildReportAlertPoints(alertPoints, { reportId, userId });

	const reportRecipients: CreateReportRecipientRequest[] = draft.report_recipients.map(
		(recipient) => {
			const recipientPayload: CreateReportRecipientRequest = {
				communication_method: parseOptionalInteger(recipient.communication_method) ?? 1
			};

			const recipientCreatedAt = cleanOptional(recipient.created_at);
			const recipientEmail = cleanOptional(recipient.email);
			const recipientId = parseOptionalInteger(recipient.id);
			const recipientName = cleanOptional(recipient.name);
			const recipientReportId = cleanOptional(recipient.report_id) ?? reportId;
			const recipientUserId = cleanOptional(recipient.user_id) ?? userId;

			if (recipientCreatedAt) recipientPayload.created_at = recipientCreatedAt;
			if (recipientEmail) recipientPayload.email = recipientEmail;
			if (recipientId !== undefined) recipientPayload.id = recipientId;
			if (recipientName) recipientPayload.name = recipientName;
			if (recipientReportId) recipientPayload.report_id = recipientReportId;
			if (recipientUserId) recipientPayload.user_id = recipientUserId;

			return recipientPayload;
		}
	);

	const reportDataProcessingSchedules: CreateReportDataProcessingScheduleRequest[] =
		draft.report_data_processing_schedules
			.filter((schedule) => schedule.day_of_week && schedule.start_time && schedule.end_time)
			.map((schedule) => {
				const entry: CreateReportDataProcessingScheduleRequest = {
					day_of_week: parseInt(schedule.day_of_week, 10),
					start_time: schedule.start_time,
					end_time: schedule.end_time
				};

				if (schedule.crosses_midnight !== undefined) {
					entry.crosses_midnight = schedule.crosses_midnight;
				}
				if (schedule.id) entry.id = schedule.id;
				entry.is_enabled = schedule.is_enabled;
				if (schedule.report_id) entry.report_id = schedule.report_id;
				if (schedule.rule_type) entry.rule_type = schedule.rule_type;
				if (schedule.timezone) entry.timezone = schedule.timezone;

				return entry;
			});

	const payload: CreateReportRequest = {
		dev_eui: devEui,
		name: draft.name.trim(),
		report_alert_points: reportAlertPoints,
		report_data_processing_schedules: reportDataProcessingSchedules,
		report_recipients: reportRecipients,
		report_user_schedule: reportUserSchedule
	};

	if (createdAt) payload.created_at = createdAt;
	if (dataPullInterval !== undefined) payload.data_pull_interval = dataPullInterval;
	if (id !== undefined) payload.id = id;
	if (reportId) payload.report_id = reportId;
	if (userId) payload.user_id = userId;

	return payload;
}

function buildAlertValidationIssues(alertPoints: CwAlertPointsValue): string[] {
	const issues: string[] = [];

	alertPoints.points.forEach((point, index) => {
		const rowIndex = String(index + 1);

		if (!point.name.trim()) {
			issues.push(m.reports_create_validation_alert_name({ index: rowIndex }));
		}

		if (point.condition === 'range') {
			const min = parseOptionalNumber(point.min);
			const max = parseOptionalNumber(point.max);

			if (min === undefined || max === undefined) {
				issues.push(m.reports_create_validation_alert_range_required({ index: rowIndex }));
			} else if (min > max) {
				issues.push(m.reports_create_validation_alert_range_order({ index: rowIndex }));
			}
		} else if (parseOptionalNumber(point.value) === undefined) {
			issues.push(m.reports_create_validation_alert_value({ index: rowIndex }));
		}

		const hexColor = cleanOptional(point.color);
		if (hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
			issues.push(m.reports_create_validation_alert_hex({ index: rowIndex }));
		}
	});

	return issues;
}

export function buildValidationIssues(
	draft: ReportDraft,
	rootDevEui: string,
	alertPoints: CwAlertPointsValue,
	currentUser: CurrentUser
): string[] {
	const issues: string[] = [];
	const normalizedRootDevEui = normalizeDevEui(rootDevEui);
	const rootUserId = cleanOptional(draft.user_id) ?? currentUser?.id ?? undefined;

	if (!draft.name.trim()) {
		issues.push(m.reports_create_validation_report_name_required());
	}

	if (normalizedRootDevEui.length !== 16) {
		issues.push(m.reports_create_validation_dev_eui_length());
	}

	draft.report_user_schedule.forEach((schedule, index) => {
		const scheduleDevEui = normalizeDevEui(schedule.dev_eui) || normalizedRootDevEui;
		const rowIndex = String(index + 1);

		if (scheduleDevEui.length !== 16) {
			issues.push(m.reports_create_validation_schedule_dev_eui({ index: rowIndex }));
		}

		if (schedule.is_active && !schedule.end_of_week && !schedule.end_of_day) {
			issues.push(m.reports_create_validation_schedule_cadence({ index: rowIndex }));
		}
	});

	issues.push(...buildAlertValidationIssues(alertPoints));

	draft.report_recipients.forEach((recipient, index) => {
		const rowIndex = String(index + 1);
		const communicationMethod = parseOptionalInteger(recipient.communication_method);
		const email = cleanOptional(recipient.email);
		const userId = cleanOptional(recipient.user_id) ?? rootUserId;

		if (!communicationMethod) {
			issues.push(m.reports_create_validation_recipient_method({ index: rowIndex }));
		}

		if (!email && !userId) {
			issues.push(m.reports_create_validation_recipient_destination({ index: rowIndex }));
		}

		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			issues.push(m.reports_create_validation_recipient_email({ index: rowIndex }));
		}
	});

	return issues;
}
