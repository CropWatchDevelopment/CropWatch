import { describe, expect, it, vi } from 'vitest';
import * as displays from './index';

// Stand-ins for the component modules: this checks which file each name
// re-exports, without compiling every display for the server here (the
// components themselves are tested in the browser, next to each one).
vi.mock('./AirDisplay/AirDisplay.svelte', () => ({ default: 'AirDisplay/AirDisplay.svelte' }));
vi.mock('./SoilDisplay/SoilDisplay.svelte', () => ({ default: 'SoilDisplay/SoilDisplay.svelte' }));
vi.mock('./TrafficDisplay/TrafficDisplay.svelte', () => ({
	default: 'TrafficDisplay/TrafficDisplay.svelte'
}));
vi.mock('./WaterDisplay/WaterDisplay.svelte', () => ({
	default: 'WaterDisplay/WaterDisplay.svelte'
}));
vi.mock('./RelayDisplay/RelayDisplay.svelte', () => ({
	default: 'RelayDisplay/RelayDisplay.svelte'
}));
vi.mock('./PowerDisplay/PowerDisplay.svelte', () => ({
	default: 'PowerDisplay/PowerDisplay.svelte'
}));
vi.mock('./SignalStrength/SignalStrength.svelte', () => ({
	default: 'SignalStrength/SignalStrength.svelte'
}));
vi.mock('./DefaultDisplay.svelte', () => ({ default: 'DefaultDisplay.svelte' }));

describe('displays barrel', () => {
	it('re-exports every display component under its name', () => {
		expect({ ...displays }).toEqual({
			AirDisplay: 'AirDisplay/AirDisplay.svelte',
			SoilDisplay: 'SoilDisplay/SoilDisplay.svelte',
			TrafficDisplay: 'TrafficDisplay/TrafficDisplay.svelte',
			WaterDisplay: 'WaterDisplay/WaterDisplay.svelte',
			RelayDisplay: 'RelayDisplay/RelayDisplay.svelte',
			PowerDisplay: 'PowerDisplay/PowerDisplay.svelte',
			SignalStrength: 'SignalStrength/SignalStrength.svelte',
			DefaultDisplay: 'DefaultDisplay.svelte'
		});
	});
});
