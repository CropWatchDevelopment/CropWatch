import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type {
	ReportUserSchedule,
	ReportUserScheduleInsert,
	ReportUserScheduleUpdate
} from '../models/Report';

/**
 * Repository for report user schedule data operations
 */
export class ReportUserScheduleRepository extends BaseRepository<ReportUserSchedule, number> {
	protected tableName = 'report_user_schedule';
	protected primaryKey = 'id';
	protected entityName = 'ReportUserSchedule';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find schedules by report ID
	 * @param reportId Report ID to search for
	 */
	async findByReportId(reportId: string): Promise<ReportUserSchedule[]> {
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
				`Error finding schedules for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Find schedules by device EUI
	 * @param devEui Device EUI to search for
	 */
	async findByDeviceEui(devEui: string): Promise<ReportUserSchedule[]> {
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
				`Error finding schedules for device: ${devEui}`
			);
			throw error;
		}
	}

	/**
	 * Find active schedules by user ID
	 * @param userId User ID to search for
	 */
	async findActiveByUserId(userId: string): Promise<ReportUserSchedule[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.eq('user_id', userId)
				.eq('is_active', true)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding active schedules for user: ${userId}`
			);
			throw error;
		}
	}

	/**
	 * Create a new schedule
	 * @param schedule Schedule data to insert
	 */
	async createSchedule(schedule: ReportUserScheduleInsert): Promise<ReportUserSchedule> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.insert(schedule)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, 'Error creating schedule');
			throw error;
		}
	}

	/**
	 * Update a schedule
	 * @param id Schedule ID
	 * @param updates Schedule updates
	 */
	async updateSchedule(id: number, updates: ReportUserScheduleUpdate): Promise<ReportUserSchedule> {
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
			this.errorHandler.handleDatabaseError(error as any, `Error updating schedule: ${id}`);
			throw error;
		}
	}

	/**
	 * Delete schedules by report ID
	 * @param reportId Report ID to delete schedules for
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
				`Error deleting schedules for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Activate/deactivate a schedule
	 * @param id Schedule ID
	 * @param isActive Whether the schedule should be active
	 */
	async setScheduleActive(id: number, isActive: boolean): Promise<ReportUserSchedule> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.update({ is_active: isActive })
				.eq('id', id)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error setting schedule active status: ${id}`
			);
			throw error;
		}
	}
}
