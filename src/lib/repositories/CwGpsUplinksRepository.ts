import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwGpsUplinks = Tables<'cw_gps_uplinks'>;
type CwGpsUplinksInsert = Tables<'cw_gps_uplinks'>;
type CwGpsUplinksUpdate = Tables<'cw_gps_uplinks'>;

class CwGpsUplinksRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwGpsUplinks | null> {
    const { data, error } = await this.client
      .from('cw_gps_uplinks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_gps_uplinks by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwGpsUplinks[]> {
    const { data, error } = await this.client
      .from('cw_gps_uplinks')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_gps_uplinks:', error.message);
      return [];
    }

    return data;
  }

  async insert(uplink: CwGpsUplinksInsert): Promise<CwGpsUplinks | null> {
    const { data, error } = await this.client
      .from('cw_gps_uplinks')
      .insert(uplink)
      .single();

    if (error) {
      console.error('Error inserting cw_gps_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, uplink: CwGpsUplinksUpdate): Promise<CwGpsUplinks | null> {
    const { data, error } = await this.client
      .from('cw_gps_uplinks')
      .update(uplink)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_gps_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_gps_uplinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_gps_uplinks:', error.message);
      return false;
    }

    return true;
  }
}

export default CwGpsUplinksRepository;
