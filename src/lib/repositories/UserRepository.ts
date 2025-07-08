import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { User } from '../models/User';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for user profile data access
 */
export class UserRepository extends BaseRepository<User, string> {
	protected tableName = 'profiles';
	protected primaryKey = 'id';
	protected entityName = 'User';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Get all users ordered by full name
	 */
	async findAll(): Promise<User[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('id, email, full_name, username')
			.order('full_name', { ascending: true });

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding all users');
		}

		return (data as User[]) || [];
	}
}
