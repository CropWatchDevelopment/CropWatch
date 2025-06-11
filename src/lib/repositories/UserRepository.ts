import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TYPES } from '$lib/server/ioc.types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

@injectable()
export class UserRepository {
  constructor(
    @inject(TYPES.SupabaseClient) private supabase: SupabaseClient,
    @inject(TYPES.ErrorHandlingService) private errorHandler: ErrorHandlingService
  ) {}

  async findAll(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, username')
      .order('full_name', { ascending: true });

    if (error) {
      this.errorHandler.handleDatabaseError(error, 'Error fetching users');
      return [];
    }
    return data || [];
  }
}
