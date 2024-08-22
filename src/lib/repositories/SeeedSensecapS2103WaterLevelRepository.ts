import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedSensecapS2103WaterLevel = Tables<'seeed_sensecap_s2103_WaterLevel'>;
type SeeedSensecapS2103WaterLevelInsert = Tables<'seeed_sensecap_s2103_WaterLevel'>;
type SeeedSensecapS2103WaterLevelUpdate = Tables<'seeed_sensecap_s2103_WaterLevel'>;

class SeeedSensecapS2103WaterLevelRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<SeeedSensecapS2103WaterLevel | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2103_WaterLevel')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching seeed_sensecap_s2103_WaterLevel by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<SeeedSensecapS2103WaterLevel[]> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2103_WaterLevel')
      .select('*');

    if (error) {
      console.error('Error fetching all seeed_sensecap_s2103_WaterLevel:', error.message);
      return [];
    }

    return data;
  }

  async insert(waterLevel: SeeedSensecapS2103WaterLevelInsert): Promise<SeeedSensecapS2103WaterLevel | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2103_WaterLevel')
      .insert(waterLevel)
      .single();

    if (error) {
      console.error('Error inserting seeed_sensecap_s2103_WaterLevel:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, waterLevel: SeeedSensecapS2103WaterLevelUpdate): Promise<SeeedSensecapS2103WaterLevel | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2103_WaterLevel')
      .update(waterLevel)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating seeed_sensecap_s2103_WaterLevel:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('seeed_sensecap_s2103_WaterLevel')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting seeed_sensecap_s2103_WaterLevel:', error.message);
      return false;
    }

    return true;
  }
}

export default SeeedSensecapS2103WaterLevelRepository;
