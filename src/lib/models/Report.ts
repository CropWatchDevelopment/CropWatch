import type { Database } from '../../../database.types';

/**
 * Represents a report entity from the database
 */
export type Report = Database['public']['Tables']['reports']['Row'];

/**
 * Type for creating a new report
 */
export type ReportInsert = Database['public']['Tables']['reports']['Insert'];

/**
 * Type for updating an existing report
 */
export type ReportUpdate = Database['public']['Tables']['reports']['Update'];

/**
 * Represents a report alert point entity from the database
 */
export type ReportAlertPoint = Database['public']['Tables']['report_alert_points']['Row'];

/**
 * Type for creating a new report alert point
 */
export type ReportAlertPointInsert = Database['public']['Tables']['report_alert_points']['Insert'];

/**
 * Type for updating an existing report alert point
 */
export type ReportAlertPointUpdate = Database['public']['Tables']['report_alert_points']['Update'];

/**
 * Represents a report recipient entity from the database
 */
export type ReportRecipient = Database['public']['Tables']['report_recipients']['Row'];

/**
 * Type for creating a new report recipient
 */
export type ReportRecipientInsert = Database['public']['Tables']['report_recipients']['Insert'];

/**
 * Type for updating an existing report recipient
 */
export type ReportRecipientUpdate = Database['public']['Tables']['report_recipients']['Update'];

/**
 * Represents a report user schedule entity from the database
 */
export type ReportUserSchedule = Database['public']['Tables']['report_user_schedule']['Row'];

/**
 * Type for creating a new report user schedule
 */
export type ReportUserScheduleInsert =
	Database['public']['Tables']['report_user_schedule']['Insert'];

/**
 * Type for updating an existing report user schedule
 */
export type ReportUserScheduleUpdate =
	Database['public']['Tables']['report_user_schedule']['Update'];

/**
 * Type for communication method entity
 */
export type CommunicationMethod = Database['public']['Tables']['communication_methods']['Row'];

/**
 * Extended report type with related data
 */
export interface ReportWithDetails extends Report {
	alert_points?: ReportAlertPoint[];
	recipients?: ReportRecipient[];
	schedules?: ReportUserSchedule[];
}

/**
 * Report with recipient and communication method details
 */
export interface ReportWithRecipients extends Report {
	recipients?: (ReportRecipient & {
		communication_method_details?: CommunicationMethod;
	})[];
}
