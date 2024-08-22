import type { SupabaseClient } from '@supabase/supabase-js';
import SeeedCo2LorawanUplinksRepository from '$lib/repositories/SeeedCo2LorawanUplinksRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedCo2LorawanUplinks = Tables<'seeed_co2_lorawan_uplinks'>;
type SeeedCo2LorawanUplinksInsert = Tables<'seeed_co2_lorawan_uplinks'>;
type SeeedCo2LorawanUplinksUpdate = Tables<'seeed_co2_lorawan_uplinks'>;

class SeeedCo2LorawanUplinksService {
  private repository: SeeedCo2LorawanUplinksRepository;

  constructor(client: SupabaseClient) {
    this.repository = new SeeedCo2LorawanUplinksRepository(client);
  }

  async getById(id: number): Promise<SeeedCo2LorawanUplinks | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<SeeedCo2LorawanUplinks[]> {
    return await this.repository.findAll();
  }

  async add(data: SeeedCo2LorawanUplinksInsert): Promise<SeeedCo2LorawanUplinks | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: SeeedCo2LorawanUplinksUpdate): Promise<SeeedCo2LorawanUplinks | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default SeeedCo2LorawanUplinksService;
