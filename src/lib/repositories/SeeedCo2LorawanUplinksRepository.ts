import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedCo2LorawanUplinks = Tables<'seeed_co2_lorawan_uplinks'>;
type SeeedCo2LorawanUplinksInsert = Tables<'seeed_co2_lorawan_uplinks'>;
type SeeedCo2LorawanUplinksUpdate = Tables<'seeed_co2_lorawan_uplinks'>;

class SeeedCo2LorawanUplinksRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<SeeedCo2LorawanUplinks | null> {
    const { data, error } = await this.client
      .from('seeed_co2_lorawan_uplinks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching seeed_co2_lorawan_uplinks by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<SeeedCo2LorawanUplinks[]> {
    const { data, error } = await this.client
      .from('seeed_co2_lorawan_uplinks')
      .select('*');

    if (error) {
      console.error('Error fetching all seeed_co2_lorawan_uplinks:', error.message);
      return [];
    }

    return data;
  }

  async insert(uplink: SeeedCo2LorawanUplinksInsert): Promise<SeeedCo2LorawanUplinks | null> {
    const { data, error } = await this.client
      .from('seeed_co2_lorawan_uplinks')
      .insert(uplink)
      .single();

    if (error) {
      console.error('Error inserting seeed_co2_lorawan_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, uplink: SeeedCo2LorawanUplinksUpdate): Promise<SeeedCo2LorawanUplinks | null> {
    const { data, error } = await this.client
      .from('seeed_co2_lorawan_uplinks')
      .update(uplink)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating seeed_co2_lorawan_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('seeed_co2_lorawan_uplinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting seeed_co2_lorawan_uplinks:', error.message);
      return false;
    }

    return true;
  }
}

export default SeeedCo2LorawanUplinksRepository;
