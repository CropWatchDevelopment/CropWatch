import type { IReportService } from '../interfaces/IReportService';
import { ReportRepository } from '../repositories/ReportRepository';
import { ReportAlertPointRepository } from '../repositories/ReportAlertPointRepository';
import { ReportRecipientRepository } from '../repositories/ReportRecipientRepository';
import { ReportUserScheduleRepository } from '../repositories/ReportUserScheduleRepository';
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
 * Implementation of ReportService
 * This service handles all business logic related to reports
 */
export class ReportService implements IReportService {
	constructor(
		private reportRepository: ReportRepository,
		private alertPointRepository: ReportAlertPointRepository,
		private recipientRepository: ReportRecipientRepository,
		private scheduleRepository: ReportUserScheduleRepository
	) {}

	/**
	 * Get all reports
	 */
	async getAllReports(devEui: string): Promise<Report[]> {
		return this.reportRepository.findAll();
	}

	/**
	 * Get reports by device EUI
	 */
	async getReportsByDeviceEui(devEui: string): Promise<Report[]> {
		return this.reportRepository.findByDeviceEui(devEui);
	}

	/**
	 * Get report by report ID
	 */
	async getReportByReportId(reportId: string): Promise<Report | null> {
		return this.reportRepository.findByReportId(reportId);
	}

	/**
	 * Get reports with full details by device EUI
	 */
	async getReportsWithDetailsByDeviceEui(devEui: string): Promise<ReportWithDetails[]> {
		return this.reportRepository.findWithDetailsByDeviceEui(devEui);
	}

	/**
	 * Get reports with recipients by device EUI
	 */
	async getReportsWithRecipientsByDeviceEui(devEui: string): Promise<ReportWithRecipients[]> {
		return this.reportRepository.findWithRecipientsByDeviceEui(devEui);
	}

	/**
	 * Create a new report
	 */
	async createReport(report: ReportInsert): Promise<Report> {
		// Generate a unique report ID if not provided
		// if (!report.report_id) {
		// 	report.report_id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		// }

		return this.reportRepository.create(report as any);
	}

	/**
	 * Update a report
	 */
	async updateReport(reportId: string, updates: ReportUpdate): Promise<Report> {
		const updatedReport = await this.reportRepository.update(reportId, updates as any);
		if (!updatedReport) {
			throw new Error(`Report not found: ${reportId}`);
		}
		return updatedReport;
	}

	/**
	 * Upsert a report (create or update)
	 */
	async upsertReport(report: ReportInsert): Promise<Report> {
		return this.reportRepository.upsert(report as any);
	}

	/**
	 * Delete a report and all related data
	 */
	async deleteReport(reportId: string): Promise<void> {
		// Delete related data first (order matters for foreign key constraints)
		await this.deleteAlertPointsByReportId(reportId);
		await this.deleteRecipientsByReportId(reportId);
		await this.deleteSchedulesByReportId(reportId);

		// Finally delete the report
		await this.reportRepository.deleteByReportId(reportId);
	}

	/**
	 * Count reports for a device
	 */
	async countReportsByDeviceEui(devEui: string): Promise<number> {
		return this.reportRepository.countByDeviceEui(devEui);
	}

	/**
	 * Get alert points for a report
	 */
	async getAlertPointsByReportId(reportId: string): Promise<ReportAlertPoint[]> {
		return this.alertPointRepository.findByReportId(reportId);
	}

	/**
	 * Create an alert point
	 */
	async createAlertPoint(alertPoint: ReportAlertPointInsert): Promise<ReportAlertPoint> {
		return this.alertPointRepository.createAlertPoint(alertPoint);
	}

	/**
	 * Update an alert point
	 */
	async updateAlertPoint(id: number, updates: ReportAlertPointUpdate): Promise<ReportAlertPoint> {
		return this.alertPointRepository.updateAlertPoint(id, updates);
	}

	/**
	 * Upsert an alert point
	 */
	async upsertAlertPoint(alertPoint: ReportAlertPointInsert): Promise<ReportAlertPoint> {
		return this.alertPointRepository.upsertAlertPoint(alertPoint);
	}

	/**
	 * Delete alert points for a report
	 */
	async deleteAlertPointsByReportId(reportId: string): Promise<void> {
		return this.alertPointRepository.deleteByReportId(reportId);
	}

	/**
	 * Get recipients for a report
	 */
	async getRecipientsByReportId(reportId: string): Promise<ReportRecipient[]> {
		return this.recipientRepository.findByReportId(reportId);
	}

	/**
	 * Create a recipient
	 */
	async createRecipient(recipient: ReportRecipientInsert): Promise<ReportRecipient> {
		return this.recipientRepository.createRecipient(recipient);
	}

	/**
	 * Update a recipient
	 */
	async updateRecipient(id: number, updates: ReportRecipientUpdate): Promise<ReportRecipient> {
		return this.recipientRepository.updateRecipient(id, updates);
	}

	/**
	 * Upsert a recipient
	 */
	async upsertRecipient(recipient: ReportRecipientInsert): Promise<ReportRecipient> {
		return this.recipientRepository.upsertRecipient(recipient);
	}

	/**
	 * Delete recipients for a report
	 */
	async deleteRecipientsByReportId(reportId: string): Promise<void> {
		return this.recipientRepository.deleteByReportId(reportId);
	}

	/**
	 * Delete a specific recipient
	 */
	async deleteRecipient(id: number): Promise<void> {
		return this.recipientRepository.deleteRecipient(id);
	}

	/**
	 * Get schedules for a report
	 */
	async getSchedulesByReportId(reportId: string): Promise<ReportUserSchedule[]> {
		return this.scheduleRepository.findByReportId(reportId);
	}

	/**
	 * Get schedules by device EUI
	 */
	async getSchedulesByDeviceEui(devEui: string): Promise<ReportUserSchedule[]> {
		return this.scheduleRepository.findByDeviceEui(devEui);
	}

	/**
	 * Get active schedules for a user
	 */
	async getActiveSchedulesByUserId(userId: string): Promise<ReportUserSchedule[]> {
		return this.scheduleRepository.findActiveByUserId(userId);
	}

	/**
	 * Create a schedule
	 */
	async createSchedule(schedule: ReportUserScheduleInsert): Promise<ReportUserSchedule> {
		return this.scheduleRepository.createSchedule(schedule);
	}

	/**
	 * Update a schedule
	 */
	async updateSchedule(id: number, updates: ReportUserScheduleUpdate): Promise<ReportUserSchedule> {
		return this.scheduleRepository.updateSchedule(id, updates);
	}

	/**
	 * Upsert a schedule
	 */
	async upsertSchedule(schedule: ReportUserScheduleInsert): Promise<ReportUserSchedule> {
		return this.scheduleRepository.upsertSchedule(schedule);
	}

	/**
	 * Delete schedules for a report
	 */
	async deleteSchedulesByReportId(reportId: string): Promise<void> {
		return this.scheduleRepository.deleteByReportId(reportId);
	}

	/**
	 * Activate/deactivate a schedule
	 */
	async setScheduleActive(id: number, isActive: boolean): Promise<ReportUserSchedule> {
		return this.scheduleRepository.setScheduleActive(id, isActive);
	}
}
