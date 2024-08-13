import type { SupabaseClient } from '@supabase/supabase-js';
import CwPermissionLevelTypesRepository from '$lib/repositories/CwPermissionLevelTypesRepository';
import type { Tables } from '$lib/types/supabaseSchema';
import CwProfileRepository from '$lib/repositories/CwProfilesRepository';

type CwProfile = Tables<'profiles'>;

class CwPermissionLevelTypesService {
  private repository: CwProfileRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwProfileRepository(client);
  }

  async getById(uuid: string): Promise<CwProfile | null> {
    return await this.repository.findById(uuid);
  }

  async getAll(): Promise<CwProfile[]> {
    return await this.repository.findAll();
  }
}

export default CwPermissionLevelTypesService;
