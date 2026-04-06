import { m } from '$lib/paraglide/messages.js';

export function getPermissionLevelOptions(viewerLabel?: string) {
	return [
		{ label: m.permission_level_admin(), value: '1' },
		{ label: m.permission_level_manager(), value: '2' },
		{ label: viewerLabel ?? m.permission_level_user(), value: '3' },
		{ label: m.permission_level_disabled(), value: '4' }
	];
}

export function getPermissionLevelLabel(value: string | number, viewerLabel?: string): string {
	switch (String(value)) {
		case '1':
			return m.permission_level_admin();
		case '2':
			return m.permission_level_manager();
		case '3':
			return viewerLabel ?? m.permission_level_user();
		default:
			return m.permission_level_disabled();
	}
}

export function getRuleOperatorOptions() {
	return [
		{ label: m.rule_operator_greater_than(), value: '>' },
		{ label: m.rule_operator_less_than(), value: '<' },
		{ label: m.rule_operator_equal_to(), value: '=' },
		{ label: m.rule_operator_greater_or_equal(), value: '>=' },
		{ label: m.rule_operator_less_or_equal(), value: '<=' },
		{ label: m.rule_operator_not_equal(), value: '!=' }
	];
}

export function getRuleNotifierTypeOptions() {
	return [
		{ label: m.rule_notifier_email(), value: '1' },
		{ label: m.rule_notifier_sms(), value: '2' },
		{ label: m.rule_notifier_push(), value: '3' },
		{ label: m.rule_notifier_discord(), value: '4' }
	];
}

export function getRuleSendMethodOptions() {
	return [
		{ label: m.rule_send_email(), value: 'email' },
		{ label: m.rule_send_sms(), value: 'sms' },
		{ label: m.rule_send_both(), value: 'both' }
	];
}

export function getRuleSubjectOptions() {
	return [
		{ label: m.rule_subject_temperature(), value: 'temperature_c' },
		{ label: m.rule_subject_humidity(), value: 'humidity' },
		{ label: m.rule_subject_co2(), value: 'co2' },
		{ label: m.rule_subject_co(), value: 'co' },
		{ label: m.rule_subject_pressure(), value: 'pressure' },
		{ label: m.rule_subject_lux(), value: 'lux' },
		{ label: m.rule_subject_uv_index(), value: 'uv_index' },
		{ label: m.rule_subject_wind_speed(), value: 'wind_speed' },
		{ label: m.rule_subject_wind_direction(), value: 'wind_direction' },
		{ label: m.rule_subject_rainfall(), value: 'rainfall' },
		{ label: m.rule_subject_battery_level(), value: 'battery_level' },
		{ label: m.rule_subject_soil_moisture(), value: 'moisture' },
		{ label: m.rule_subject_electrical_conductivity(), value: 'ec' },
		{ label: m.rule_subject_ph(), value: 'ph' },
		{ label: m.rule_subject_water_depth(), value: 'deapth_cm' },
		{ label: m.rule_subject_spo2(), value: 'spo2' }
	];
}
