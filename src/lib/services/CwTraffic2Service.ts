import type { SupabaseClient } from '@supabase/supabase-js';
import CwTraffic2Repository from '$lib/repositories/CwTraffic2Repository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwTraffic2 = Tables<'cw_traffic2'>;
type CwTraffic2Insert = Tables<'cw_traffic2'>;
type CwTraffic2Update = Tables<'cw_traffic2'>;

class CwTraffic2Service {
  private repository: CwTraffic2Repository;

  constructor(client: SupabaseClient) {
    this.repository = new CwTraffic2Repository(client);
  }

  async getById(id: number): Promise<CwTraffic2 | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwTraffic2[]> {
    return await this.repository.findAll();
  }

  async add(data: CwTraffic2Insert): Promise<CwTraffic2 | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwTraffic2Update): Promise<CwTraffic2 | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwTraffic2Service;
