import type { CwDevice } from '../interfaces/CwDevice.interface.ts';
import type { CwDeviceOwner } from '../interfaces/CwDeviceOwner.interface.ts';
import type { CwDeviceType } from '../interfaces/CwDeviceTypeDto.interface.ts';

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	message: string;
	data?: Record<string, unknown>;
	result?: {
		accessToken?: string;
		expires_at_datetime?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export type DeviceOwnerDto = CwDeviceOwner;

export type DeviceTypeDto = CwDeviceType;

export interface DeviceDto extends CwDevice {
	cw_device_type: DeviceTypeDto;
	cw_locations?: Record<string, unknown> | Array<Record<string, unknown>>;
	cw_device_owners?: DeviceOwnerDto[];
}

export interface CreateDeviceOwnerRequest {
	user_id: string;
	permission_level: number;
	dev_eui?: string;
	owner_id?: number | null;
	[key: string]: unknown;
}

export interface CreateDeviceRequest extends Partial<CwDevice> {
	dev_eui: string;
	name: string;
	type?: number | null;
	location_id?: number | null;
	cw_device_owners?: CreateDeviceOwnerRequest[];
}

export type UpdateDeviceRequest = Partial<CreateDeviceRequest>;

export interface DevicePrimaryDataDto {
	dev_eui: string;
	created_at: string;
	name?: string;
	location_id?: number | null;
	location_name?: string;
	group?: string | null;
	co2?: number | null;
	humidity?: number | null;
	temperature_c?: number | null;
	[key: string]: unknown;
}

export interface DeviceStatusSummary {
	online: number;
	offline: number;
	[key: string]: unknown;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	[key: string]: unknown;
}

export type ListOrPaginatedResponse<T> = T[] | PaginatedResponse<T>;

export interface TimeRangeQuery {
	start?: string | Date;
	end?: string | Date;
	timezone?: string;
}

export interface PaginationQuery {
	skip?: number;
	take?: number;
}

export interface DeviceListQuery extends PaginationQuery {
	dev_eui?: string;
	group?: string;
	name?: string;
	location?: string;
}

export interface DeviceDataWithinRangeQuery extends PaginationQuery {
	start?: string | Date;
	end?: string | Date;
	timezone?: string;
}

export interface LatestPrimaryDataQuery extends PaginationQuery {
	dev_eui?: string;
	group?: string;
	locationGroup?: string;
	location?: string;
	name?: string;
}

export interface SensorTimeSeriesPoint {
	created_at: string;
	dev_eui: string;
	[key: string]: unknown;
}

export interface WaterDataPoint extends SensorTimeSeriesPoint {
	id: number;
}

export interface TrafficDataPoint extends SensorTimeSeriesPoint {
	id: number;
}

export interface TrafficMonthlyReportDto {
	traffic_day: string;
	total_people: number;
	total_bicycles: number;
	total_vehicles: number;
}

export interface TrafficMonthlyQuery {
	year: number;
	month: number;
	timezone?: string;
}

export interface PulseRelayRequest {
	relay: number;
	durationSeconds: number;
}

export interface UpdateRelayRequest {
	relay: number;
	targetState: 'on' | 'off';
}

export interface RuleCriteriaDto {
	id: number;
	operator: string;
	ruleGroupId: string;
	subject: string;
	trigger_value: number;
	created_at?: string;
	criteria_id?: string | null;
	parent_id?: string | null;
	reset_value?: number | null;
	[key: string]: unknown;
}

export interface RulesQuery {
	name?: string;
}

export interface RuleDto {
	id: number;
	name: string;
	action_recipient: string;
	notifier_type: number;
	ruleGroupId: string;
	profile_id: string;
	dev_eui?: string | null;
	send_using?: string | null;
	is_triggered: boolean;
	trigger_count: number;
	created_at: string;
	last_triggered?: string | null;
	cw_rule_criteria?: RuleCriteriaDto[];
	[key: string]: unknown;
}

export interface CreateRuleRequest extends Partial<RuleDto> {
	action_recipient: string;
	name: string;
	notifier_type: number;
	ruleGroupId: string;
}

export type UpdateRuleRequest = Partial<CreateRuleRequest>;

export interface ReportUserScheduleDto {
	id?: number;
	dev_eui: string;
	report_user_schedule_id?: number;
	is_active?: boolean;
	end_of_week?: boolean;
	end_of_month?: boolean;
	user_id?: string;
	report_id?: string | null;
	created_at?: string;
	[key: string]: unknown;
}

export interface CreateReportUserScheduleRequest {
	created_at?: string;
	dev_eui: string;
	end_of_month?: boolean;
	end_of_week?: boolean;
	id?: number;
	is_active?: boolean;
	report_id?: string | null;
	report_user_schedule_id?: number;
	user_id?: string;
	[key: string]: unknown;
}

export interface ReportAlertPointDto {
	id?: number;
	data_point_key: string;
	name: string;
	report_id: string;
	user_id?: string;
	value?: number | null;
	min?: number | null;
	max?: number | null;
	operator?: string | null;
	hex_color?: string | null;
	created_at?: string;
	[key: string]: unknown;
}

export interface CreateReportAlertPointRequest {
	created_at?: string;
	data_point_key: string;
	hex_color?: string | null;
	id?: number;
	max?: number | null;
	min?: number | null;
	name: string;
	operator?: string | null;
	report_id?: string | null;
	user_id?: string | null;
	value?: number | null;
	[key: string]: unknown;
}

export interface ReportRecipientDto {
	id?: number;
	communication_method: number;
	report_id: string;
	name?: string | null;
	email?: string | null;
	user_id?: string | null;
	created_at?: string;
	[key: string]: unknown;
}

export interface CreateReportRecipientRequest {
	communication_method: number;
	created_at?: string;
	email?: string | null;
	id?: number;
	name?: string | null;
	report_id?: string | null;
	user_id?: string | null;
	[key: string]: unknown;
}

export interface ReportDataProcessingScheduleDto {
	created_at: string;
	crosses_midnight: boolean;
	day_of_week: number;
	end_time: string;
	id: string;
	is_enabled: boolean;
	report_id: string;
	rule_type: string;
	start_time: string;
	timezone: string;
	updated_at: string;
	valid_from?: unknown | null;
	valid_to?: unknown | null;
	[key: string]: unknown;
}

export interface CreateReportDataProcessingScheduleRequest {
	created_at?: string;
	crosses_midnight?: boolean;
	day_of_week: number;
	end_time: string;
	id?: string;
	is_enabled?: boolean;
	report_id?: string;
	rule_type?: string;
	start_time: string;
	timezone?: string;
	updated_at?: string;
	valid_from?: unknown | null;
	valid_to?: unknown | null;
	[key: string]: unknown;
}

export interface ReportsQuery {
	name?: string;
}

export interface ReportDto {
	id: number;
	report_id: string;
	name: string;
	dev_eui: string;
	created_at: string;
	user_id?: string | null;
	report_user_schedule?: ReportUserScheduleDto[];
	report_alert_points?: ReportAlertPointDto[];
	report_recipients?: ReportRecipientDto[];
	report_data_processing_schedules?: ReportDataProcessingScheduleDto[];
	[key: string]: unknown;
}

export interface CreateReportRequest {
	created_at?: string;
	dev_eui: string;
	id?: number;
	name: string;
	report_id?: string;
	user_id?: string | null;
	report_user_schedule?: CreateReportUserScheduleRequest[];
	report_alert_points?: CreateReportAlertPointRequest[];
	report_recipients?: CreateReportRecipientRequest[];
	report_data_processing_schedules?: CreateReportDataProcessingScheduleRequest[];
}

export type UpdateReportRequest = Partial<CreateReportRequest>;

export type TriggeredRulesCountResponse =
	| number
	| {
			count: number;
			[key: string]: unknown;
	  };

export interface LocationOwnerDto {
	admin_user_id: string;
	description?: Record<string, unknown> | null;
	id: number;
	is_active?: Record<string, unknown> | null;
	location_id: number;
	owner_id: number;
	permission_level?: Record<string, unknown> | null;
	user_id: string;
	[key: string]: unknown;
}

export interface LocationsQuery {
	name?: string;
}

export interface LocationDto {
	created_at: string;
	description?: Record<string, unknown> | null;
	group?: Record<string, unknown> | null;
	lat?: Record<string, unknown> | null;
	location_id: number;
	long?: Record<string, unknown> | null;
	map_zoom?: Record<string, unknown> | null;
	name: string;
	owner_id?: Record<string, unknown> | null;
	cw_location_owners?: LocationOwnerDto[];
	[key: string]: unknown;
}

export interface CreateLocationOwnerRequest {
	admin_user_id: string;
	location_id: number;
	user_id: string;
	description?: Record<string, unknown> | null;
	id?: number;
	is_active?: Record<string, unknown> | null;
	owner_id?: number;
	permission_level?: Record<string, unknown> | null;
	[key: string]: unknown;
}

export interface UpdateLocationOwnerRequest {
	admin_user_id?: string;
	location_id?: number;
	user_id?: string;
	description?: Record<string, unknown> | null;
	id?: number;
	is_active?: Record<string, unknown> | null;
	owner_id?: number;
	permission_level?: Record<string, unknown> | null;
	[key: string]: unknown;
}

export interface CreateLocationRequest {
	name: string;
	description?: string | null;
	group?: string | null;
	lat?: number | null;
	long?: number | null;
	[key: string]: unknown;
}

export type UpdateLocationRequest = {
	name: string;
	description?: string | null;
	group?: string | null;
};
