export interface CwDeviceOwner {
	dev_eui: string;
	user_id: string;
	permission_level: number;
	id?: number;
	owner_id?: number | null;
	user_email?: string;
	targetUserEmail?: string;
	[key: string]: unknown;
}
