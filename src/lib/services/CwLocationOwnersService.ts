import type { SupabaseClient } from '@supabase/supabase-js';
import CwLocationOwnersRepository from '$lib/repositories/CwLocationOwnersRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocationOwners = Tables<'cw_location_owners'>;
type CwLocationOwnersInsert = Tables<'cw_location_owners'>;
type CwLocationOwnersUpdate = Tables<'cw_location_owners'>;

class CwLocationOwnersService {
  private repository: CwLocationOwnersRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwLocationOwnersRepository(client);
  }

  async getById(id: number): Promise<CwLocationOwners | null> {
    return await this.repository.findById(id);
  }

  async getAll(id: number): Promise<CwLocationOwners[]> {
    return await this.repository.findAll(id);
  }

  async add(data: CwLocationOwnersInsert): Promise<CwLocationOwners | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwLocationOwnersUpdate): Promise<CwLocationOwners | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwLocationOwnersService;
