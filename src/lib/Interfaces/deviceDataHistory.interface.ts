	export interface DeviceDataHistory {
		timestamp: string;
		temperature: number;
		humidity: number;
		co2?: number | null;
		alert: boolean;
		note?: string;
	};
