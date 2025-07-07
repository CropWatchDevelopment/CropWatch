import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type {
	ReportAlertPoint,
	ReportAlertPointInsert,
	ReportAlertPointUpdate
} from '../models/Report';

/**
 * Repository for report alert point data operations
 */
export class ReportAlertPointRepository extends BaseRepository<ReportAlertPoint, number> {
	protected tableName = 'report_alert_points';
	protected primaryKey = 'id';
	protected entityName = 'ReportAlertPoint';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find alert points by report ID
	 * @param reportId Report ID to search for
	 */
	async findByReportId(reportId: string): Promise<ReportAlertPoint[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.eq('report_id', reportId)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding alert points for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Create a new alert point
	 * @param alertPoint Alert point data to insert
	 */
	async createAlertPoint(alertPoint: ReportAlertPointInsert): Promise<ReportAlertPoint> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.insert(alertPoint)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, 'Error creating alert point');
			throw error;
		}
	}

	/**
	 * Update an alert point
	 * @param id Alert point ID
	 * @param updates Alert point updates
	 */
	async updateAlertPoint(id: number, updates: ReportAlertPointUpdate): Promise<ReportAlertPoint> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.update(updates)
				.eq('id', id)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, `Error updating alert point: ${id}`);
			throw error;
		}
	}

	/**
	 * Upsert an alert point
	 * @param alertPoint Alert point data to upsert
	 */
	async upsertAlertPoint(alertPoint: ReportAlertPointInsert): Promise<ReportAlertPoint> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.upsert(alertPoint)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, 'Error upserting alert point');
			throw error;
		}
	}

	/**
	 * Delete alert points by report ID
	 * @param reportId Report ID to delete alert points for
	 */
	async deleteByReportId(reportId: string): Promise<void> {
		try {
			const { error } = await this.supabase.from(this.tableName).delete().eq('report_id', reportId);

			if (error) {
				throw error;
			}
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error deleting alert points for report: ${reportId}`
			);
			throw error;
		}
	}
}
