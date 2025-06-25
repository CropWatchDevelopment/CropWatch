export interface DeviceDataRecord {
	dev_eui: string;
	created_at: string;
	[key: string]: unknown;
}

export type DeviceStats = Record<
	string,
	{
		min: number;
		max: number;
		avg: number;
		median: number;
		stdDev: number;
		count: number;
		lastReading: number;
		trend: 'up' | 'down' | 'stable' | null;
	}
>;
