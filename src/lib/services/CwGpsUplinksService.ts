import type { SupabaseClient } from '@supabase/supabase-js';
import CwGpsUplinksRepository from '$lib/repositories/CwGpsUplinksRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwGpsUplinks = Tables<'cw_gps_uplinks'>;
type CwGpsUplinksInsert = Tables<'cw_gps_uplinks'>;
type CwGpsUplinksUpdate = Tables<'cw_gps_uplinks'>;

class CwGpsUplinksService {
  private repository: CwGpsUplinksRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwGpsUplinksRepository(client);
  }

  async getById(id: number): Promise<CwGpsUplinks | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwGpsUplinks[]> {
    return await this.repository.findAll();
  }

  async add(data: CwGpsUplinksInsert): Promise<CwGpsUplinks | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwGpsUplinksUpdate): Promise<CwGpsUplinks | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwGpsUplinksService;
