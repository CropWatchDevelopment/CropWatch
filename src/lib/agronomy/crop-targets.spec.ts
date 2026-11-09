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
	// Stress limits 12 and 35 around the optimal band 19–24.
	const band = target({});

	it('steps by how far past the band, as a share of the nearest bound', () => {
		expect(judgeReading(19, band)).toBe('optimal');
		expect(judgeReading(24, band)).toBe('optimal');
		expect(judgeReading(18, band)).toBe('slightly_low'); // 1/19 = 5 %
		expect(judgeReading(15, band)).toBe('low'); // 4/19 = 21 %
		expect(judgeReading(13, band)).toBe('very_low'); // 6/19 = 32 %
		expect(judgeReading(25, band)).toBe('slightly_high'); // 1/24 = 4 %
		expect(judgeReading(28, band)).toBe('high'); // 4/24 = 17 %
		expect(judgeReading(32, band)).toBe('very_high'); // 8/24 = 33 %
	});

	it('counts 10 % and 25 % as the edges of slightly and low/high', () => {
		const wide = target({ min_value: null, optimal_min: 20, optimal_max: 24, max_value: null });
		expect(judgeReading(18, wide)).toBe('slightly_low'); // exactly 10 %
		expect(judgeReading(17.9, wide)).toBe('low');
		expect(judgeReading(15, wide)).toBe('low'); // exactly 25 %
		expect(judgeReading(14.9, wide)).toBe('very_low');
		expect(judgeReading(26.4, wide)).toBe('slightly_high'); // exactly 10 %
		expect(judgeReading(30, wide)).toBe('high'); // exactly 25 %
		expect(judgeReading(30.1, wide)).toBe('very_high');
	});

	it('is always very low or very high past a stress limit, however close to the band', () => {
		const night = target({ min_value: 12, optimal_min: 12, optimal_max: 16, max_value: null });
		expect(judgeReading(11.9, night)).toBe('very_low');
		expect(judgeReading(10, band)).toBe('very_low');
		expect(judgeReading(40, band)).toBe('very_high');
	});

	it('measures against the band width when the bound is zero', () => {
		const fromZero = target({ min_value: null, optimal_min: 0, optimal_max: 10, max_value: null });
		expect(judgeReading(-1, fromZero)).toBe('slightly_low'); // 1/10 of the band
		expect(judgeReading(-3, fromZero)).toBe('very_low');
	});

	it('works with open ends', () => {
		const lowerOnly = target({ min_value: null, optimal_max: null, max_value: null });
		expect(judgeReading(18, lowerOnly)).toBe('slightly_low');
		expect(judgeReading(5, lowerOnly)).toBe('very_low');
		expect(judgeReading(500, lowerOnly)).toBe('optimal');
	});

	it('has nothing to say without a reading or a band', () => {
		expect(judgeReading(null, band)).toBeNull();
		expect(judgeReading(undefined, band)).toBeNull();
		expect(judgeReading(Number.NaN, band)).toBeNull();
		expect(judgeReading(20, null)).toBeNull();
		const limitsOnly = target({ optimal_min: null, optimal_max: null });
		expect(judgeReading(20, limitsOnly)).toBeNull();
		expect(judgeReading(50, limitsOnly)).toBe('very_high');
		expect(judgeReading(10, limitsOnly)).toBe('very_low');
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
