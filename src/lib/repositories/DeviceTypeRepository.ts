import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { DeviceType } from '../models/Device';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for device type data access (read-only operations)
 */
export class DeviceTypeRepository extends BaseRepository<DeviceType, number> {
	protected tableName = 'cw_device_type';
	protected primaryKey = 'id';
	protected entityName = 'DeviceType';

	/**
	 * Constructor with Supabase client and error handler dependencies
	 */
	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find all device types
	 */
	async findAll(): Promise<DeviceType[]> {
		const { data, error } = await this.supabase.from(this.tableName).select('*').order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding all device types');
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Find device type by ID
	 * @param id The device type ID
	 */
	async findById(id: number): Promise<DeviceType | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			// For "no rows found" error, return null
			if (error.code === 'PGRST116') {
				return null;
			}

			this.errorHandler.handleDatabaseError(error, `Error finding device type with ID: ${id}`);
		}

		return data as DeviceType;
	}

	/**
	 * Find active device types
	 */
	async findActive(): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('isActive', true)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding active device types');
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Find device types by manufacturer
	 * @param manufacturer The manufacturer name
	 */
	async findByManufacturer(manufacturer: string): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.ilike('manufacturer', `%${manufacturer}%`)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device types by manufacturer: ${manufacturer}`
			);
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Find device types by model
	 * @param model The model name or pattern
	 */
	async findByModel(model: string): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.ilike('model', `%${model}%`)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error finding device types by model: ${model}`);
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Find device types by data table
	 * @param dataTable The data table name
	 */
	async findByDataTable(dataTable: string): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('data_table_v2', dataTable)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device types by data table: ${dataTable}`
			);
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Search for device types by name
	 * @param searchTerm The search term to match against the device type name
	 */
	async searchByName(searchTerm: string): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.ilike('name', `%${searchTerm}%`)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error searching device types by name: ${searchTerm}`
			);
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Get device types with default upload interval within a range
	 * @param minInterval Minimum upload interval
	 * @param maxInterval Maximum upload interval
	 */
	async findByUploadIntervalRange(minInterval: number, maxInterval: number): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.gte('default_upload_interval', minInterval)
			.lte('default_upload_interval', maxInterval)
			.order('default_upload_interval');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device types by upload interval range: ${minInterval}-${maxInterval}`
			);
		}

		return (data as DeviceType[]) || [];
	}

	/**
	 * Find device types by primary data type
	 * @param dataType Primary data type (e.g., "temperature", "humidity")
	 */
	async findByPrimaryDataType(dataType: string): Promise<DeviceType[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.ilike('primary_data_notation', `%${dataType}%`)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device types by primary data type: ${dataType}`
			);
		}

		return (data as DeviceType[]) || [];
	}
}
