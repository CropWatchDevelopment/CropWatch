import type { SupabaseClient } from '@supabase/supabase-js';
import CwPermissionLevelTypesRepository from '$lib/repositories/CwPermissionLevelTypesRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwPermissionLevelTypes = Tables<'cw_permission_level_types'>;
type CwPermissionLevelTypesInsert = Tables<'cw_permission_level_types'>;
type CwPermissionLevelTypesUpdate = Tables<'cw_permission_level_types'>;

class CwPermissionLevelTypesService {
  private repository: CwPermissionLevelTypesRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwPermissionLevelTypesRepository(client);
  }

  async getById(id: number): Promise<CwPermissionLevelTypes | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwPermissionLevelTypes[]> {
    return await this.repository.findAll();
  }

  async add(data: CwPermissionLevelTypesInsert): Promise<CwPermissionLevelTypes | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwPermissionLevelTypesUpdate): Promise<CwPermissionLevelTypes | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwPermissionLevelTypesService;
