import type { SupabaseClient } from '@supabase/supabase-js';
import type { IRepository } from '../interfaces/IRepository';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Base abstract repository implementing common CRUD operations
 * This provides a foundation for concrete repositories
 */
export abstract class BaseRepository<T, K> implements IRepository<T, K> {
	/**
	 * The table name in the database
	 */
	protected abstract tableName: string;

	/**
	 * The primary key column name
	 */
	protected abstract primaryKey: string;

	/**
	 * Human readable entity name for error messages
	 */
	protected abstract entityName: string;

	/**
	 * Constructor with SupabaseClient and ErrorHandlingService dependencies
	 */
	constructor(
		protected supabase: SupabaseClient,
		protected errorHandler: ErrorHandlingService
	) {}

	/**
	 * Find an entity by its primary key
	 * @param id The primary key value
	 */
	async findById(id: K): Promise<T | null> {
		try {
			const { data, error } = await this.supabase
				.from(this.tableName)
				.select('*')
				.eq(this.primaryKey, id)
				.single();

			if (error) {
				// If the error is specifically that no rows were found, return null
				if (error.code === 'PGRST116') {
					return null;
				}

				this.errorHandler.handleDatabaseError(
					error,
					`Error finding ${this.entityName} with ID: ${String(id)}`
				);
			}

			return data as T;
		} catch (err) {
			this.errorHandler.handleDatabaseError(
				err as Error,
				`Error finding ${this.entityName} with ID: ${String(id)}`
			);
			return null;
		}
	}

	/**
	 * Get all entities
	 */
	async findAll(): Promise<T[]> {
		const { data, error } = await this.supabase.from(this.tableName).select('*');

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error finding all ${this.entityName} records`);
		}

		return (data as T[]) || [];
	}

	/**
	 * Create a new entity
	 * @param entity The entity to create
	 */
	async create<I>(entity: I): Promise<T> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.insert(entity)
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error creating ${this.entityName}`);
		}

		return data as T;
	}

	/**
	 * Update an existing entity
	 * @param id The primary key value
	 * @param entity The entity with updated values
	 */
	async update<U>(id: K, entity: U): Promise<T | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.update(entity)
			.eq(this.primaryKey, id)
			.select()
			.limit(1)
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error updating ${this.entityName} with ID: ${String(id)}`
			);
		}

		if (!data) {
			this.errorHandler.handleNotFound(this.entityName, String(id));
		}

		return data as T;
	}

	/**
	 * Delete an entity by its primary key
	 * @param id The primary key value
	 */
	async delete(id: K): Promise<boolean> {
		// First check if the entity exists
		const existing = await this.findById(id);
		if (!existing) {
			this.errorHandler.handleNotFound(this.entityName, String(id));
		}

		const { error } = await this.supabase.from(this.tableName).delete().eq(this.primaryKey, id);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error deleting ${this.entityName} with ID: ${String(id)}`
			);
		}

		return true;
	}

	/**
	 * Upsert an entity (insert if not exists, update if exists)
	 * @param entity The entity to upsert
	 */
	async upsert<I>(entity: I): Promise<T> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.upsert(entity, { onConflict: this.primaryKey })
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error upserting ${this.entityName}`);
		}

		return data as T;
	}
}
