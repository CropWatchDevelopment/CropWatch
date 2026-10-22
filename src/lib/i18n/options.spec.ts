import { describe, expect, it } from 'vitest';
import { CW_EMPTY_VALUE } from '@cropwatchdevelopment/cwui';
import { m } from '$lib/paraglide/messages.js';
import {
	getPermissionLevelLabel,
	getPermissionLevelOptions,
	getRuleOperatorOptions,
	getRuleSubjectOptions
} from './options';

describe('getPermissionLevelOptions', () => {
	it('lists the levels from admin to disabled, valued as the API level', () => {
		expect(getPermissionLevelOptions()).toEqual([
			{ label: m.permission_level_admin(), value: '1' },
			{ label: m.permission_level_manager(), value: '2' },
			{ label: m.permission_level_user(), value: '3' },
			{ label: m.permission_level_viewer(), value: '4' },
			{ label: m.permission_level_disabled(), value: '5' }
		]);
	});

	it('renames the user level when the caller has its own word for it', () => {
		const options = getPermissionLevelOptions('Operator');

		expect(options.map((option) => option.label)).toEqual([
			m.permission_level_admin(),
			m.permission_level_manager(),
			'Operator',
			m.permission_level_viewer(),
			m.permission_level_disabled()
		]);
	});
});

describe('getPermissionLevelLabel', () => {
	it('names each level, given as a string or a number', () => {
		expect(getPermissionLevelLabel('1')).toBe(m.permission_level_admin());
		expect(getPermissionLevelLabel(2)).toBe(m.permission_level_manager());
		expect(getPermissionLevelLabel('3')).toBe(m.permission_level_user());
		expect(getPermissionLevelLabel(4)).toBe(m.permission_level_viewer());
		expect(getPermissionLevelLabel('5')).toBe(m.permission_level_disabled());
	});

	it('uses the custom user label for the user level only', () => {
		expect(getPermissionLevelLabel(3, 'Operator')).toBe('Operator');
		expect(getPermissionLevelLabel(1, 'Operator')).toBe(m.permission_level_admin());
	});

	it('shows no level, rather than "disabled", for a value that is not a level', () => {
		for (const value of [0, 6, -1, '', 'owner', '2.5']) {
			expect(getPermissionLevelLabel(value), String(value)).toBe(CW_EMPTY_VALUE);
		}
		expect(getPermissionLevelLabel('owner', 'Operator')).toBe(CW_EMPTY_VALUE);
	});
});

describe('getRuleOperatorOptions', () => {
	it('offers every comparison operator with its symbol as the value', () => {
		expect(getRuleOperatorOptions()).toEqual([
			{ label: m.rule_operator_greater_than(), value: '>' },
			{ label: m.rule_operator_less_than(), value: '<' },
			{ label: m.rule_operator_equal_to(), value: '=' },
			{ label: m.rule_operator_greater_or_equal(), value: '>=' },
			{ label: m.rule_operator_less_or_equal(), value: '<=' },
			{ label: m.rule_operator_not_equal(), value: '!=' }
		]);
	});
});

describe('getRuleSubjectOptions', () => {
	it('offers each rule subject valued as its telemetry column', () => {
		expect(getRuleSubjectOptions()).toEqual([
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
			{ label: m.rule_subject_soil_moisture(), value: 'moisture' },
			{ label: m.rule_subject_electrical_conductivity(), value: 'ec' },
			{ label: m.rule_subject_ph(), value: 'ph' },
			// The water-level column really is spelled `deapth_cm`.
			{ label: m.rule_subject_water_depth(), value: 'deapth_cm' },
			{ label: m.rule_subject_spo2(), value: 'spo2' }
		]);
	});
});
