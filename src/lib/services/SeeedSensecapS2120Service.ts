import type { SupabaseClient } from '@supabase/supabase-js';
import SeeedSensecapS2120Repository from '$lib/repositories/SeeedSensecapS2120Repository';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedSensecapS2120 = Tables<'seeed_sensecap_s2120'>;
type SeeedSensecapS2120Insert = Tables<'seeed_sensecap_s2120'>;
type SeeedSensecapS2120Update = Tables<'seeed_sensecap_s2120'>;

class SeeedSensecapS2120Service {
  private repository: SeeedSensecapS2120Repository;

  constructor(client: SupabaseClient) {
    this.repository = new SeeedSensecapS2120Repository(client);
  }

  async getById(id: number): Promise<SeeedSensecapS2120 | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<SeeedSensecapS2120[]> {
    return await this.repository.findAll();
  }

  async add(data: SeeedSensecapS2120Insert): Promise<SeeedSensecapS2120 | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: SeeedSensecapS2120Update): Promise<SeeedSensecapS2120 | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default SeeedSensecapS2120Service;
