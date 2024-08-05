import type { SupabaseClient } from '@supabase/supabase-js';
import CwWatermeterUplinksRepository from '$lib/repositories/CwWatermeterUplinksRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwWatermeterUplinks = Tables<'cw_watermeter_uplinks'>;
type CwWatermeterUplinksInsert = Tables<'cw_watermeter_uplinks'>;
type CwWatermeterUplinksUpdate = Tables<'cw_watermeter_uplinks'>;

class CwWatermeterUplinksService {
  private repository: CwWatermeterUplinksRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwWatermeterUplinksRepository(client);
  }

  async getById(id: number): Promise<CwWatermeterUplinks | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwWatermeterUplinks[]> {
    return await this.repository.findAll();
  }

  async add(data: CwWatermeterUplinksInsert): Promise<CwWatermeterUplinks | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwWatermeterUplinksUpdate): Promise<CwWatermeterUplinks | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwWatermeterUplinksService;
