import type {
	ReportTemplateAlertPointInput,
	ReportTemplateDataProcessingScheduleInput,
	ReportTemplateDto,
	ReportTemplateRecipientInput,
	ReportTemplateSaveRequest,
	ReportTemplateScheduleInput
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import type { CwAlertPointCondition, CwAlertPointRule, CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
import {
	DEFAULT_REPORT_DATA_PULL_INTERVAL,
	normalizeReportDataPullInterval,
	parseReportDataPullInterval
} from './data-pull-interval';

export type SelectOption = {
	disabled?: boolean;
	label: string;
	value: string;
};

export type CadenceDraft = {
	end_of_day: boolean;
	end_of_week: boolean;
	end_of_month: boolean;
	utc_offset: string;
	is_active: boolean;
	key: string;
};

export type RecipientDraft = {
	communication_method: string;
	email: string;
	name: string;
	key: string;
};

export type DataProcessingScheduleDraft = {
	crosses_midnight: boolean;
	day_of_week: string;
	end_time: string;
	is_enabled: boolean;
	key: string;
	rule_type: string;
	start_time: string;
	timezone: string;
};

export type ReportTemplateDraft = {
	name: string;
	description: string;
	data_pull_interval: string;
	is_active: boolean;
	cadence: CadenceDraft;
	recipients: RecipientDraft[];
	data_processing_schedules: DataProcessingScheduleDraft[];
};

const DEFAULT_ALERT_DATA_POINT_KEY = 'temperature_c';

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

export function createReportTemplateDraftFactory(nextRowKey: (prefix: string) => string) {
	function createEmptyCadence(): CadenceDraft {
		return {
			end_of_day: false,
			end_of_week: true,
			end_of_month: false,
			utc_offset: '0',
			is_active: true,
			key: nextRowKey('cadence')
		};
	}

	function createEmptyRecipient(email = '', name = ''): RecipientDraft {
		return {
			communication_method: '1',
			email,
			name,
			key: nextRowKey('recipient')
		};
	}

	function createEmptyDataProcessingSchedule(): DataProcessingScheduleDraft {
		return {
			crosses_midnight: false,
			day_of_week: '1',
			end_time: '17:00',
			is_enabled: true,
			key: nextRowKey('dps'),
			rule_type: 'include',
			start_time: '09:00',
			timezone: 'UTC'
		};
	}

	function buildDefaultDraft(currentUserEmail = '', currentUserName = ''): ReportTemplateDraft {
		return {
			name: '',
			description: '',
			data_pull_interval: DEFAULT_REPORT_DATA_PULL_INTERVAL,
			is_active: true,
			cadence: createEmptyCadence(),
			recipients: [createEmptyRecipient(currentUserEmail, currentUserName)],
			data_processing_schedules: []
		};
	}

	function buildDraftFromTemplate(template: ReportTemplateDto): ReportTemplateDraft {
		const firstSchedule = template.schedule[0];

		const cadence: CadenceDraft = firstSchedule
			? {
					end_of_day: firstSchedule.endOfDay,
					end_of_week: firstSchedule.endOfWeek,
					end_of_month: firstSchedule.endOfMonth,
					utc_offset: String(firstSchedule.utcOffset ?? 0),
					// Schedule-level active flag is no longer surfaced in the UI (it was
					// redundant with the template-level "Active template" toggle, which is
					// the single pause control). Keep the schedule active; pausing is done
					// at the template level.
					is_active: true,
					key: nextRowKey('cadence')
				}
			: createEmptyCadence();

		const recipients =
			template.recipients.length > 0
				? template.recipients.map((recipient) => ({
						communication_method: String(recipient.communicationMethod ?? 1),
						email: recipient.email ?? '',
						name: recipient.name ?? '',
						key: nextRowKey('recipient')
					}))
				: [createEmptyRecipient()];

		const dataProcessingSchedules = template.dataProcessingSchedules.map((schedule) => ({
			crosses_midnight: schedule.crossesMidnight ?? false,
			day_of_week: String(schedule.dayOfWeek ?? 1),
			end_time: schedule.endTime ?? '17:00',
			is_enabled: schedule.isEnabled ?? true,
			key: nextRowKey('dps'),
			rule_type: schedule.ruleType ?? 'include',
			start_time: schedule.startTime ?? '09:00',
			timezone: schedule.timezone ?? 'UTC'
		}));

		return {
			name: template.name ?? '',
			description: template.description ?? '',
			data_pull_interval: normalizeReportDataPullInterval(template.dataPullInterval),
			is_active: template.isActive ?? true,
			cadence,
			recipients,
			data_processing_schedules: dataProcessingSchedules
		};
	}

	function buildAlertPointsValueFromTemplate(template: ReportTemplateDto): CwAlertPointsValue {
		const baseValue = createEmptyAlertPointsValue();
		const points: CwAlertPointRule[] = template.alertPoints.map((point, index) => {
			const condition =
				typeof point.operator === 'string' && point.operator.trim().length > 0
					? mapOperatorToAlertCondition(point.operator)
					: point.min != null || point.max != null
						? 'range'
						: 'equals';

			return {
				color: cleanOptional(point.hexColor ?? '')?.toUpperCase() ?? '',
				condition,
				id: point.id != null ? String(point.id) : nextRowKey(`alert-${index + 1}`),
				max: point.max != null ? String(point.max) : '',
				min: point.min != null ? String(point.min) : '',
				name: point.name ?? '',
				value: point.value != null ? String(point.value) : ''
			};
		});

		return { ...baseValue, points };
	}

	return {
		buildAlertPointsValueFromTemplate,
		buildDefaultDraft,
		buildDraftFromTemplate,
		createEmptyDataProcessingSchedule,
		createEmptyRecipient
	};
}

function buildAlertPoints(alertPoints: CwAlertPointsValue): ReportTemplateAlertPointInput[] {
	return alertPoints.points.map((point) => {
		const input: ReportTemplateAlertPointInput = {
			dataPointKey: DEFAULT_ALERT_DATA_POINT_KEY,
			name: point.name.trim()
		};

		const hexColor = cleanOptional(point.color)?.toUpperCase();
		const max = parseOptionalNumber(point.max);
		const min = parseOptionalNumber(point.min);
		const operator = cleanOptional(mapAlertConditionToOperator(point.condition));
		const value = parseOptionalNumber(point.value);

		if (hexColor) input.hexColor = hexColor;
		if (max !== undefined) input.max = max;
		if (min !== undefined) input.min = min;
		if (operator) input.operator = operator;
		if (value !== undefined) input.value = value;

		return input;
	});
}

export function buildSaveRequest(
	draft: ReportTemplateDraft,
	devEuis: string[],
	alertPoints: CwAlertPointsValue,
	deviceTypeId: number | null
): ReportTemplateSaveRequest {
	const dataPullInterval = parseReportDataPullInterval(draft.data_pull_interval);

	const schedule: ReportTemplateScheduleInput[] = [
		{
			endOfDay: draft.cadence.end_of_day,
			endOfWeek: draft.cadence.end_of_week,
			endOfMonth: draft.cadence.end_of_month,
			utcOffset: parseOptionalInteger(draft.cadence.utc_offset) ?? 0,
			isActive: draft.cadence.is_active
		}
	];

	const recipients: ReportTemplateRecipientInput[] = draft.recipients.map((recipient) => {
		const input: ReportTemplateRecipientInput = {
			communicationMethod: parseOptionalInteger(recipient.communication_method) ?? 1
		};

		const email = cleanOptional(recipient.email);
		const name = cleanOptional(recipient.name);

		if (email) input.email = email;
		if (name) input.name = name;

		return input;
	});

	const dataProcessingSchedules: ReportTemplateDataProcessingScheduleInput[] =
		draft.data_processing_schedules
			.filter((schedule) => schedule.day_of_week && schedule.start_time && schedule.end_time)
			.map((schedule) => {
				const input: ReportTemplateDataProcessingScheduleInput = {
					dayOfWeek: Number.parseInt(schedule.day_of_week, 10),
					startTime: schedule.start_time,
					endTime: schedule.end_time
				};

				input.crossesMidnight = schedule.crosses_midnight;
				input.isEnabled = schedule.is_enabled;
				if (schedule.rule_type) input.ruleType = schedule.rule_type;
				if (schedule.timezone) input.timezone = schedule.timezone;

				return input;
			});

	const payload: ReportTemplateSaveRequest = {
		name: draft.name.trim(),
		description: cleanOptional(draft.description) ?? null,
		isActive: draft.is_active,
		deviceTypeId,
		devEuis,
		schedule,
		recipients,
		alertPoints: buildAlertPoints(alertPoints),
		dataProcessingSchedules
	};

	if (dataPullInterval !== undefined) payload.dataPullInterval = dataPullInterval;

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
	draft: ReportTemplateDraft,
	devEuis: string[],
	alertPoints: CwAlertPointsValue
): string[] {
	const issues: string[] = [];

	if (!draft.name.trim()) {
		issues.push(m.reports_create_validation_report_name_required());
	}

	if (devEuis.length === 0) {
		issues.push(m.reports_new_validation_devices_required());
	}

	if (draft.cadence.is_active && !draft.cadence.end_of_week && !draft.cadence.end_of_day && !draft.cadence.end_of_month) {
		issues.push(m.reports_new_validation_cadence_required());
	}

	issues.push(...buildAlertValidationIssues(alertPoints));

	draft.recipients.forEach((recipient, index) => {
		const rowIndex = String(index + 1);
		const communicationMethod = parseOptionalInteger(recipient.communication_method);
		const email = cleanOptional(recipient.email);

		if (!communicationMethod) {
			issues.push(m.reports_create_validation_recipient_method({ index: rowIndex }));
		}

		if (!email) {
			issues.push(m.reports_new_validation_recipient_email_required({ index: rowIndex }));
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			issues.push(m.reports_create_validation_recipient_email({ index: rowIndex }));
		}
	});

	return issues;
}
