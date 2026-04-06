import { getUiLocale } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import type { CwAlertPointsEditorText } from '@cropwatchdevelopment/cwui';

function formatOverlapLabels(labels: string[]): string {
	return labels.join(getUiLocale() === 'ja' ? '、' : ', ');
}

export function createReportAlertPointsEditorText(): CwAlertPointsEditorText {
	return {
		unitFieldLabel: m.reports_create_alert_points_unit_label(),
		centerFieldLabel: m.reports_create_alert_points_center_label(),
		nameFieldLabel: m.common_name(),
		conditionFieldLabel: m.reports_create_alert_operator(),
		valueFieldLabel: m.reports_create_alert_value(),
		minValueFieldLabel: m.reports_create_alert_minimum(),
		maxValueFieldLabel: m.reports_create_alert_maximum(),
		colorFieldLabel: m.reports_create_alert_hex_color(),
		addAlertPointButton: m.reports_create_add_alert(),
		removePointButton: m.action_remove(),
		emptyTitle: m.reports_create_alert_points_empty_title(),
		emptyDescription: m.reports_create_alert_points_empty_description(),
		invalidNumberError: m.reports_create_alert_points_invalid_number(),
		requiredFieldError: (label) => m.reports_create_alert_points_required_field({ label }),
		fieldLabelWithUnit: (label, unit) =>
			m.reports_create_alert_points_label_with_unit({ label, unit }),
		invalidPreviewNote: (count) =>
			count === 1
				? m.reports_create_alert_points_invalid_preview_single()
				: m.reports_create_alert_points_invalid_preview_multiple({
						count: String(count)
					}),
		overlapPreviewNote: (count) =>
			count === 1
				? m.reports_create_alert_points_overlap_preview_single()
				: m.reports_create_alert_points_overlap_preview_multiple({
						count: String(count)
					}),
		minEqualsMaxWarning: m.reports_create_alert_points_equal_bounds_warning(),
		defaultPointName: (index) => m.reports_create_alert_heading({ index: String(index) }),
		unitCelsiusLabel: '°C',
		unitFahrenheitLabel: '°F',
		unitKelvinLabel: '°K',
		conditionEqualsLabel: m.reports_create_alert_points_condition_equals(),
		conditionRangeLabel: m.reports_create_alert_points_condition_range(),
		conditionLessThanLabel: m.reports_create_alert_points_condition_less_than(),
		conditionLessThanOrEqualLabel: m.reports_create_alert_points_condition_less_than_or_equal(),
		conditionGreaterThanLabel: m.reports_create_alert_points_condition_greater_than(),
		conditionGreaterThanOrEqualLabel:
			m.reports_create_alert_points_condition_greater_than_or_equal(),
		pointDescriptionWaitingForValue: m.reports_create_alert_points_waiting_for_value(),
		pointDescriptionWaitingForThreshold: m.reports_create_alert_points_waiting_for_threshold(),
		pointDescriptionRangeMissingBounds: m.reports_create_alert_points_range_missing_bounds(),
		pointDescriptionEquals: (value, unit) =>
			m.reports_create_alert_points_description_equals({ value, unit }),
		pointDescriptionRange: (min, max, unit) =>
			m.reports_create_alert_points_description_range({ min, max, unit }),
		pointDescriptionLessThan: (value, unit) =>
			m.reports_create_alert_points_description_less_than({ value, unit }),
		pointDescriptionLessThanOrEqual: (value, unit) =>
			m.reports_create_alert_points_description_less_than_or_equal({ value, unit }),
		pointDescriptionGreaterThan: (value, unit) =>
			m.reports_create_alert_points_description_greater_than({ value, unit }),
		pointDescriptionGreaterThanOrEqual: (value, unit) =>
			m.reports_create_alert_points_description_greater_than_or_equal({ value, unit }),
		overlapError: (labels) =>
			m.reports_create_alert_points_overlap_error({
				labels: formatOverlapLabels(labels)
			})
	};
}
