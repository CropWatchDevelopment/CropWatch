import type {
	Report,
	ReportInsert,
	ReportUpdate,
	ReportWithDetails,
	ReportWithRecipients,
	ReportAlertPoint,
	ReportAlertPointInsert,
	ReportAlertPointUpdate,
	ReportRecipient,
	ReportRecipientInsert,
	ReportRecipientUpdate,
	ReportUserSchedule,
	ReportUserScheduleInsert,
	ReportUserScheduleUpdate
} from '../models/Report';

/**
 * Service interface for report operations
 */
export interface IReportService {
	/**
	 * Get reports by device EUI
	 */
	getReportsByDeviceEui(devEui: string): Promise<Report[]>;

	/**
	 * Get report by report ID
	 */
	getReportByReportId(reportId: string): Promise<Report | null>;

	/**
	 * Get reports with full details by device EUI
	 */
	getReportsWithDetailsByDeviceEui(devEui: string): Promise<ReportWithDetails[]>;

	/**
	 * Get reports with recipients by device EUI
	 */
	getReportsWithRecipientsByDeviceEui(devEui: string): Promise<ReportWithRecipients[]>;

	/**
	 * Create a new report
	 */
	createReport(report: ReportInsert): Promise<Report>;

	/**
	 * Update a report
	 */
	updateReport(reportId: string, updates: ReportUpdate): Promise<Report>;

	/**
	 * Delete a report and all related data
	 */
	deleteReport(reportId: string): Promise<void>;

	/**
	 * Count reports for a device
	 */
	countReportsByDeviceEui(devEui: string): Promise<number>;

	/**
	 * Get alert points for a report
	 */
	getAlertPointsByReportId(reportId: string): Promise<ReportAlertPoint[]>;

	/**
	 * Create an alert point
	 */
	createAlertPoint(alertPoint: ReportAlertPointInsert): Promise<ReportAlertPoint>;

	/**
	 * Update an alert point
	 */
	updateAlertPoint(id: number, updates: ReportAlertPointUpdate): Promise<ReportAlertPoint>;

	/**
	 * Delete alert points for a report
	 */
	deleteAlertPointsByReportId(reportId: string): Promise<void>;

	/**
	 * Get recipients for a report
	 */
	getRecipientsByReportId(reportId: string): Promise<ReportRecipient[]>;

	/**
	 * Create a recipient
	 */
	createRecipient(recipient: ReportRecipientInsert): Promise<ReportRecipient>;

	/**
	 * Update a recipient
	 */
	updateRecipient(id: number, updates: ReportRecipientUpdate): Promise<ReportRecipient>;

	/**
	 * Delete recipients for a report
	 */
	deleteRecipientsByReportId(reportId: string): Promise<void>;

	/**
	 * Delete a specific recipient
	 */
	deleteRecipient(id: number): Promise<void>;

	/**
	 * Get schedules for a report
	 */
	getSchedulesByReportId(reportId: string): Promise<ReportUserSchedule[]>;

	/**
	 * Get schedules by device EUI
	 */
	getSchedulesByDeviceEui(devEui: string): Promise<ReportUserSchedule[]>;

	/**
	 * Get active schedules for a user
	 */
	getActiveSchedulesByUserId(userId: string): Promise<ReportUserSchedule[]>;

	/**
	 * Create a schedule
	 */
	createSchedule(schedule: ReportUserScheduleInsert): Promise<ReportUserSchedule>;

	/**
	 * Update a schedule
	 */
	updateSchedule(id: number, updates: ReportUserScheduleUpdate): Promise<ReportUserSchedule>;

	/**
	 * Delete schedules for a report
	 */
	deleteSchedulesByReportId(reportId: string): Promise<void>;

	/**
	 * Activate/deactivate a schedule
	 */
	setScheduleActive(id: number, isActive: boolean): Promise<ReportUserSchedule>;
}
