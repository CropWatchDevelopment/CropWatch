import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwTraffic2 = Tables<'cw_traffic2'>;
type CwTraffic2Insert = Tables<'cw_traffic2'>;
type CwTraffic2Update = Tables<'cw_traffic2'>;

class CwTraffic2Repository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwTraffic2 | null> {
    const { data, error } = await this.client
      .from('cw_traffic2')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_traffic2 by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwTraffic2[]> {
    const { data, error } = await this.client
      .from('cw_traffic2')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_traffic2:', error.message);
      return [];
    }

    return data;
  }

  async insert(traffic2: CwTraffic2Insert): Promise<CwTraffic2 | null> {
    const { data, error } = await this.client
      .from('cw_traffic2')
      .insert(traffic2)
      .single();

    if (error) {
      console.error('Error inserting cw_traffic2:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, traffic2: CwTraffic2Update): Promise<CwTraffic2 | null> {
    const { data, error } = await this.client
      .from('cw_traffic2')
      .update(traffic2)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_traffic2:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_traffic2')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_traffic2:', error.message);
      return false;
    }

    return true;
  }
}

export default CwTraffic2Repository;
