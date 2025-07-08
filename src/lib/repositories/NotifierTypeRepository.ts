import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { NotifierType } from '../models/NotifierType';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for notifier type data access
 */
export class NotifierTypeRepository extends BaseRepository<NotifierType, number> {
	protected tableName = 'cw_notifier_types';
	protected primaryKey = 'id';
	protected entityName = 'NotifierType';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find all notifier types
	 */
	async findAll(): Promise<NotifierType[]> {
		const { data, error } = await this.supabase.from(this.tableName).select('*').order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding all notifier types');
		}

		return (data as NotifierType[]) || [];
	}
}
