import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type NetvoxRa02a = Tables<'netvox_ra02a'>;
type NetvoxRa02aInsert = Tables<'netvox_ra02a'>;
type NetvoxRa02aUpdate = Tables<'netvox_ra02a'>;

class NetvoxRa02aRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<NetvoxRa02a | null> {
    const { data, error } = await this.client
      .from('netvox_ra02a')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching netvox_ra02a by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<NetvoxRa02a[]> {
    const { data, error } = await this.client
      .from('netvox_ra02a')
      .select('*');

    if (error) {
      console.error('Error fetching all netvox_ra02a:', error.message);
      return [];
    }

    return data;
  }

  async insert(device: NetvoxRa02aInsert): Promise<NetvoxRa02a | null> {
    const { data, error } = await this.client
      .from('netvox_ra02a')
      .insert(device)
      .single();

    if (error) {
      console.error('Error inserting netvox_ra02a:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, device: NetvoxRa02aUpdate): Promise<NetvoxRa02a | null> {
    const { data, error } = await this.client
      .from('netvox_ra02a')
      .update(device)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating netvox_ra02a:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('netvox_ra02a')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting netvox_ra02a:', error.message);
      return false;
    }

    return true;
  }
}

export default NetvoxRa02aRepository;
