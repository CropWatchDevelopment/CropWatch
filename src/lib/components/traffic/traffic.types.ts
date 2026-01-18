export type TrafficClassKey = 'people' | 'bicycles' | 'cars' | 'trucks' | 'buses';

export type TrafficClass = {
	key: TrafficClassKey;
	label: string;
	short: string;
};

export type TrafficTotals = Record<TrafficClassKey, number>;

export type TrafficHourBin = {
	hour: number;
	totals: TrafficTotals;
};

export type TrafficRow = {
	dev_eui: string;
	created_at: string;
	traffic_hour: string | null;
	line_number: number | null;
	people_count: number | null;
	bicycle_count: number | null;
	car_count: number | null;
	truck_count: number | null;
	bus_count: number | null;
};

export type TrafficWeather = {
	icon: string;
	summary: string;
	tMinC: number;
	tMaxC: number;
};

export type TrafficCalendarEntry = {
	key: TrafficClassKey;
	short: string;
	value: number;
	dim: boolean;
};

export type TrafficCalendarCell = {
	inMonth: boolean;
	dayNum?: number;
	dateKey?: string;
	entries?: TrafficCalendarEntry[];
	weather?: TrafficWeather | null;
};
