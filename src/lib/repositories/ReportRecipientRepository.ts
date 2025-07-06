import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type {
	ReportRecipient,
	ReportRecipientInsert,
	ReportRecipientUpdate,
	CommunicationMethod
} from '../models/Report';

/**
 * Repository for report recipient data operations
 */
export class ReportRecipientRepository extends BaseRepository<ReportRecipient, number> {
	protected tableName = 'report_recipients';
	protected primaryKey = 'id';
	protected entityName = 'ReportRecipient';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find recipients by report ID
	 * @param reportId Report ID to search for
	 */
	async findByReportId(reportId: string): Promise<ReportRecipient[]> {
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
				`Error finding recipients for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Find recipients with communication method details by report ID
	 * @param reportId Report ID to search for
	 */
	async findWithCommunicationMethodByReportId(
		reportId: string
	): Promise<(ReportRecipient & { communication_method_details?: CommunicationMethod })[]> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select(
					`
          *,
          communication_methods:communication_method(*)
        `
				)
				.eq('report_id', reportId)
				.order('created_at', { ascending: false });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			this.errorHandler.handleDatabaseError(
				error as any,
				`Error finding recipients with communication methods for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Create a new recipient
	 * @param recipient Recipient data to insert
	 */
	async createRecipient(recipient: ReportRecipientInsert): Promise<ReportRecipient> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.insert(recipient)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return data;
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, 'Error creating recipient');
			throw error;
		}
	}

	/**
	 * Update a recipient
	 * @param id Recipient ID
	 * @param updates Recipient updates
	 */
	async updateRecipient(id: number, updates: ReportRecipientUpdate): Promise<ReportRecipient> {
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
			this.errorHandler.handleDatabaseError(error as any, `Error updating recipient: ${id}`);
			throw error;
		}
	}

	/**
	 * Delete recipients by report ID
	 * @param reportId Report ID to delete recipients for
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
				`Error deleting recipients for report: ${reportId}`
			);
			throw error;
		}
	}

	/**
	 * Delete a specific recipient
	 * @param id Recipient ID to delete
	 */
	async deleteRecipient(id: number): Promise<void> {
		try {
			const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

			if (error) {
				throw error;
			}
		} catch (error) {
			this.errorHandler.handleDatabaseError(error as any, `Error deleting recipient: ${id}`);
			throw error;
		}
	}
}
