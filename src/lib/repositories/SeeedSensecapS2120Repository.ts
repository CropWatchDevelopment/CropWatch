import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedSensecapS2120 = Tables<'seeed_sensecap_s2120'>;
type SeeedSensecapS2120Insert = Tables<'seeed_sensecap_s2120'>;
type SeeedSensecapS2120Update = Tables<'seeed_sensecap_s2120'>;

class SeeedSensecapS2120Repository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<SeeedSensecapS2120 | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2120')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching seeed_sensecap_s2120 by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<SeeedSensecapS2120[]> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2120')
      .select('*');

    if (error) {
      console.error('Error fetching all seeed_sensecap_s2120:', error.message);
      return [];
    }

    return data;
  }

  async insert(sensor: SeeedSensecapS2120Insert): Promise<SeeedSensecapS2120 | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2120')
      .insert(sensor)
      .single();

    if (error) {
      console.error('Error inserting seeed_sensecap_s2120:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, sensor: SeeedSensecapS2120Update): Promise<SeeedSensecapS2120 | null> {
    const { data, error } = await this.client
      .from('seeed_sensecap_s2120')
      .update(sensor)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating seeed_sensecap_s2120:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('seeed_sensecap_s2120')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting seeed_sensecap_s2120:', error.message);
      return false;
    }

    return true;
  }
}

export default SeeedSensecapS2120Repository;
