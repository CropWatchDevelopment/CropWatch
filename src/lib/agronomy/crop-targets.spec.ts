import { describe, expect, it } from 'vitest';
import type { CropTargetDto, CropTypeDetailDto } from '$lib/api/api.dtos';
import { cropDisplayName, cropTarget, judgeReading, vaporPressureDeficit } from './crop-targets';

function target(overrides: Partial<CropTargetDto>): CropTargetDto {
	return {
		metric: 'soil_moisture',
		period: 'all',
		unit: '%',
		min_value: 12,
		optimal_min: 19,
		optimal_max: 24,
		max_value: 35,
		notes: null,
		sources: [],
		...overrides
	};
}

const tomato: CropTypeDetailDto = {
	id: 1,
	code: 'tomato',
	name_en: 'Tomato',
	name_ja: 'トマト',
	category: 'fruiting_vegetable',
	cultivation: 'both',
	sort_order: 10,
	notes: null,
	is_active: true,
	targets: [
		target({}),
		target({
			metric: 'air_temperature',
			period: 'day',
			unit: '°C',
			optimal_min: 20,
			optimal_max: 25
		}),
		target({
			metric: 'air_temperature',
			period: 'night',
			unit: '°C',
			optimal_min: 10,
			optimal_max: 15
		})
	]
};

describe('cropTarget', () => {
	it('prefers the row for this part of the day', () => {
		expect(cropTarget(tomato, 'air_temperature', 'day')?.optimal_min).toBe(20);
		expect(cropTarget(tomato, 'air_temperature', 'night')?.optimal_min).toBe(10);
	});

	it('falls back to the all-day row, and is null without one', () => {
		expect(cropTarget(tomato, 'soil_moisture', 'night')?.optimal_max).toBe(24);
		expect(cropTarget(tomato, 'co2', 'day')).toBeNull();
		expect(cropTarget(null, 'soil_moisture', 'day')).toBeNull();
		expect(cropTarget(undefined, 'soil_moisture', 'day')).toBeNull();
	});
});

describe('judgeReading', () => {
	const band = target({});

	it('places a reading against the band and the stress limits', () => {
		expect(judgeReading(10, band)).toBe('too_low');
		expect(judgeReading(15, band)).toBe('low');
		expect(judgeReading(19, band)).toBe('optimal');
		expect(judgeReading(24, band)).toBe('optimal');
		expect(judgeReading(30, band)).toBe('high');
		expect(judgeReading(40, band)).toBe('too_high');
	});

	it('works with open ends', () => {
		const lowerOnly = target({ min_value: null, optimal_max: null, max_value: null });
		expect(judgeReading(5, lowerOnly)).toBe('low');
		expect(judgeReading(500, lowerOnly)).toBe('optimal');
	});

	it('has nothing to say without a reading or a band', () => {
		expect(judgeReading(null, band)).toBeNull();
		expect(judgeReading(undefined, band)).toBeNull();
		expect(judgeReading(Number.NaN, band)).toBeNull();
		expect(judgeReading(20, null)).toBeNull();
		const limitsOnly = target({ optimal_min: null, optimal_max: null });
		expect(judgeReading(20, limitsOnly)).toBeNull();
		expect(judgeReading(50, limitsOnly)).toBe('too_high');
	});
});

describe('cropDisplayName', () => {
	it('uses the Japanese name for Japanese and English otherwise', () => {
		expect(cropDisplayName(tomato, 'ja')).toBe('トマト');
		expect(cropDisplayName(tomato, 'ja-JP')).toBe('トマト');
		expect(cropDisplayName(tomato, 'en-US')).toBe('Tomato');
	});
});

describe('vaporPressureDeficit', () => {
	it('matches the saturation vapour pressure table', () => {
		// es(25 °C) ≈ 3.17 kPa, so 60 % RH leaves ≈ 1.27 kPa.
		expect(vaporPressureDeficit(25, 60)).toBeCloseTo(1.27, 2);
		expect(vaporPressureDeficit(20, 100)).toBe(0);
	});

	it('clamps humidity and needs both readings', () => {
		expect(vaporPressureDeficit(20, 120)).toBe(0);
		expect(vaporPressureDeficit(20, -5)).toBeCloseTo(2.34, 2);
		expect(vaporPressureDeficit(null, 50)).toBeNull();
		expect(vaporPressureDeficit(20, undefined)).toBeNull();
		expect(vaporPressureDeficit(Number.NaN, 50)).toBeNull();
	});
});
