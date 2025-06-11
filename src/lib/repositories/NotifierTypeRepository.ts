import { inject, injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { NotifierType } from '../models/NotifierType';
import { TYPES } from '../server/ioc.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for notifier type data access
 */
@injectable()
export class NotifierTypeRepository extends BaseRepository<NotifierType, number> {
	protected tableName = 'cw_notifier_types';
	protected primaryKey = 'id';
	protected entityName = 'NotifierType';

	constructor(
               @inject(TYPES.SupabaseClient) supabase: SupabaseClient,
               @inject(TYPES.ErrorHandlingService) errorHandler: ErrorHandlingService
	) {
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
