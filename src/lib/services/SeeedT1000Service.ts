import type { SupabaseClient } from '@supabase/supabase-js';
import SeeedT1000Repository from '$lib/repositories/SeeedT1000Repository';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedT1000 = Tables<'seeed_t1000'>;
type SeeedT1000Insert = Tables<'seeed_t1000'>;
type SeeedT1000Update = Tables<'seeed_t1000'>;

class SeeedT1000Service {
  private repository: SeeedT1000Repository;

  constructor(client: SupabaseClient) {
    this.repository = new SeeedT1000Repository(client);
  }

  async getById(id: number): Promise<SeeedT1000 | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<SeeedT1000[]> {
    return await this.repository.findAll();
  }

  async add(data: SeeedT1000Insert): Promise<SeeedT1000 | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: SeeedT1000Update): Promise<SeeedT1000 | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default SeeedT1000Service;
