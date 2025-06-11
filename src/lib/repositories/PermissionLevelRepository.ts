import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TYPES } from '$lib/server/ioc.types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

@injectable()
export class PermissionLevelRepository {
  constructor(
    @inject(TYPES.SupabaseClient) private supabase: SupabaseClient,
    @inject(TYPES.ErrorHandlingService) private errorHandler: ErrorHandlingService
  ) {}

  async findAll(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('cw_permission_level_types')
      .select('*')
      .order('permission_level_id', { ascending: true });

    if (error) {
      this.errorHandler.handleDatabaseError(error, 'Error fetching permission levels');
      return [];
    }
    return data || [];
  }
}
