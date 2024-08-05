import type { SupabaseClient } from '@supabase/supabase-js';
import SeeedSensecapS2103WaterLevelRepository from '$lib/repositories/SeeedSensecapS2103WaterLevelRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedSensecapS2103WaterLevel = Tables<'seeed_sensecap_s2103_WaterLevel'>;
type SeeedSensecapS2103WaterLevelInsert = Tables<'seeed_sensecap_s2103_WaterLevel'>;
type SeeedSensecapS2103WaterLevelUpdate = Tables<'seeed_sensecap_s2103_WaterLevel'>;

class SeeedSensecapS2103WaterLevelService {
  private repository: SeeedSensecapS2103WaterLevelRepository;

  constructor(client: SupabaseClient) {
    this.repository = new SeeedSensecapS2103WaterLevelRepository(client);
  }

  async getById(id: number): Promise<SeeedSensecapS2103WaterLevel | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<SeeedSensecapS2103WaterLevel[]> {
    return await this.repository.findAll();
  }

  async add(data: SeeedSensecapS2103WaterLevelInsert): Promise<SeeedSensecapS2103WaterLevel | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: SeeedSensecapS2103WaterLevelUpdate): Promise<SeeedSensecapS2103WaterLevel | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default SeeedSensecapS2103WaterLevelService;
