import type { SupabaseClient } from '@supabase/supabase-js';
import type { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { Report, ReportWithDetails, ReportWithRecipients } from '../models/Report';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for report data operations
 */
export class ReportRepository extends BaseRepository<Report, string> {
	protected tableName = 'reports';
	protected primaryKey = 'report_id';
	protected entityName = 'Report';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find reports by device EUI
	 * @param devEui Device EUI to search for
	 */
	async findAll(): Promise<Report[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, `Error finding reports`);
			throw error;
		}
	}

	/**
	 * Find reports by device EUI
	 * @param devEui Device EUI to search for
	 */
	async findByDeviceEui(devEui: string): Promise<Report[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.eq('dev_eui', devEui)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding reports for device: ${devEui}`
			);
			throw error;
		}
	}

	/**
	 * Find report by report ID
	 * @param reportId Report ID to search for
	 */
	async findByReportId(reportId: string): Promise<Report | null> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.eq('report_id', reportId)
				.single();

			if (error) {
				if (error.code === 'PGRST116') {
					return null; // No data found
				}
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding report by ID: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Find reports with full details (alert points, recipients, schedules)
	 * @param devEui Device EUI to search for
	 */
	async findWithDetailsByDeviceEui(devEui: string): Promise<ReportWithDetails[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select(
					`
          *,
          report_alert_points(*),
          report_recipients(*),
          report_user_schedule(*)
        `
				)
				.eq('dev_eui', devEui)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			if (!data || !data.length) {
				return [];
			}

			// Transform data to match ReportWithDetails structure
			return data.map((item) => {
				const {
					report_alert_points: alert_points,
					report_recipients: recipients,
					report_user_schedule: schedules,
					...rest
				} = item;

				return { ...rest, alert_points, recipients, schedules };
			});
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding reports with details for device: ${devEui}`
			);
			throw error;
		}
	}

	/**
	 * Find reports with recipient details
	 * @param devEui Device EUI to search for
	 */
	async findWithRecipientsByDeviceEui(devEui: string): Promise<ReportWithRecipients[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select(
					`
          *,
          report_recipients(
            *,
            communication_methods:communication_method(*)
          )
        `
				)
				.eq('dev_eui', devEui)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding reports with recipients for device: ${devEui}`
			);
			throw error;
		}
	}

	/**
	 * Delete report and all related data (cascade delete)
	 * @param reportId Report ID to delete
	 */
	async deleteByReportId(reportId: string): Promise<void> {
		try {
			const { error } = await this.supabase.from(this.tableName).delete().eq('report_id', reportId);

			if (error) {
				throw error;
			}
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, `Error deleting report: ${reportId}`);
			throw error;
		}
	}

	/**
	 * Count reports for a device
	 * @param devEui Device EUI to count reports for
	 */
	async countByDeviceEui(devEui: string): Promise<number> {
		try {
			const { count, error } = await this.supabase
				.from(this.tableName)
				.select('*', { count: 'exact', head: true })
				.eq('dev_eui', devEui);

			if (error) {
				throw error;
			}

			return count || 0;
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error counting reports for device: ${devEui}`
			);
			throw error;
		}
	}
}
