import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';
import CwProfileRepository from '$lib/repositories/CwProfilesRepository';

type CwProfile = Tables<'profiles'>;

class CwProfileService {
  private repository: CwProfileRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwProfileRepository(client);
  }

  async getById(uuid: string): Promise<CwProfile | null> {
    return await this.repository.findById(uuid);
  }

  async getByEmail(email: string): Promise<CwProfile | null> {
    return await this.repository.findByEmail(email);
  }

  async getAll(): Promise<CwProfile[]> {
    return await this.repository.findAll();
  }
}

export default CwProfileService;
