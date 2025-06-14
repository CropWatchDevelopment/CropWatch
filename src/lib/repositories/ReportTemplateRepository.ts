import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../database.types';
import { BaseRepository } from './BaseRepository';
import { injectable, inject } from 'inversify';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { ReportTemplate } from '../models/ReportTemplate';
import { TYPES } from '../server/ioc.types';

@injectable()
export class ReportTemplateRepository extends BaseRepository<ReportTemplate, number> {
  protected tableName = 'reports_templates';
  protected primaryKey = 'id';
  protected entityName = 'Report';

  constructor(
    @inject(TYPES.SupabaseClient) supabase: SupabaseClient<Database>,
    @inject(TYPES.ErrorHandlingService) errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }

  async findByOwner(ownerId: string): Promise<ReportTemplate[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) {
      this.errorHandler.handleDatabaseError(error, 'Error fetching user reports');
    }
    return (data as ReportTemplate[]) || [];
  }
}
