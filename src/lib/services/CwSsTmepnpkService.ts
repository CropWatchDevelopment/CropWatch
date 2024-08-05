import type { SupabaseClient } from '@supabase/supabase-js';
import CwSsTmepnpkRepository from '$lib/repositories/CwSsTmepnpkRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwSsTmepnpk = Tables<'cw_ss_tmepnpk'>;
type CwSsTmepnpkInsert = Tables<'cw_ss_tmepnpk'>;
type CwSsTmepnpkUpdate = Tables<'cw_ss_tmepnpk'>;

class CwSsTmepnpkService {
  private repository: CwSsTmepnpkRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwSsTmepnpkRepository(client);
  }

  async getById(id: number): Promise<CwSsTmepnpk | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwSsTmepnpk[]> {
    return await this.repository.findAll();
  }

  async add(data: CwSsTmepnpkInsert): Promise<CwSsTmepnpk | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwSsTmepnpkUpdate): Promise<CwSsTmepnpk | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwSsTmepnpkService;
