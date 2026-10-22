import { describe, expect, it } from 'vitest';
import type { CwAlertPointsEditorText } from '@cropwatchdevelopment/cwui';
import { m } from '$lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime.js';
import { createReportAlertPointsEditorText } from './alert-points-editor-text';

const text = () => createReportAlertPointsEditorText() as Required<CwAlertPointsEditorText>;

describe('createReportAlertPointsEditorText', () => {
	it('labels the editor with the report alert texts', () => {
		expect(text()).toMatchObject({
			previewLabel: m.cwui_alert_points_preview(),
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
			minEqualsMaxWarning: m.reports_create_alert_points_equal_bounds_warning(),
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
			pointDescriptionRangeMissingBounds: m.reports_create_alert_points_range_missing_bounds()
		});
	});

	it('has no reset texts: report alert points have no reset value', () => {
		expect(text().resetFieldLabel).toBeUndefined();
		expect(text().resetNeverHappensError).toBeUndefined();
	});

	it('fills in labels, counts and values', () => {
		const t = text();

		expect(t.requiredFieldError('Value')).toBe(
			m.reports_create_alert_points_required_field({ label: 'Value' })
		);
		expect(t.fieldLabelWithUnit('Value', '°C')).toBe(
			m.reports_create_alert_points_label_with_unit({ label: 'Value', unit: '°C' })
		);
		expect(t.invalidPreviewNote(1)).toBe(m.reports_create_alert_points_invalid_preview_single());
		expect(t.invalidPreviewNote(3)).toBe(
			m.reports_create_alert_points_invalid_preview_multiple({ count: '3' })
		);
		expect(t.overlapPreviewNote(1)).toBe(m.reports_create_alert_points_overlap_preview_single());
		expect(t.overlapPreviewNote(2)).toBe(
			m.reports_create_alert_points_overlap_preview_multiple({ count: '2' })
		);
		expect(t.defaultPointName(2)).toBe(m.reports_create_alert_heading({ index: '2' }));
		expect(t.pointDescriptionEquals('5', '°C')).toBe(
			m.reports_create_alert_points_description_equals({ value: '5', unit: '°C' })
		);
		expect(t.pointDescriptionRange('1', '9', '°C')).toBe(
			m.reports_create_alert_points_description_range({ min: '1', max: '9', unit: '°C' })
		);
		expect(t.pointDescriptionLessThan('5', '°C')).toBe(
			m.reports_create_alert_points_description_less_than({ value: '5', unit: '°C' })
		);
		expect(t.pointDescriptionLessThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_description_less_than_or_equal({ value: '5', unit: '°C' })
		);
		expect(t.pointDescriptionGreaterThan('5', '°C')).toBe(
			m.reports_create_alert_points_description_greater_than({ value: '5', unit: '°C' })
		);
		expect(t.pointDescriptionGreaterThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_description_greater_than_or_equal({ value: '5', unit: '°C' })
		);
	});

	it('lists overlapping alert points with the separator of the language', () => {
		const originalGetLocale = getLocale;
		try {
			overwriteGetLocale(() => 'ja');
			expect(text().overlapError(['A', 'B'])).toBe(
				m.reports_create_alert_points_overlap_error({ labels: 'A、B' })
			);

			overwriteGetLocale(() => 'en');
			expect(text().overlapError(['A', 'B'])).toBe(
				m.reports_create_alert_points_overlap_error({ labels: 'A, B' })
			);
		} finally {
			overwriteGetLocale(originalGetLocale);
		}
	});
});
