import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type SeeedT1000 = Tables<'seeed_t1000'>;
type SeeedT1000Insert = Tables<'seeed_t1000'>;
type SeeedT1000Update = Tables<'seeed_t1000'>;

class SeeedT1000Repository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<SeeedT1000 | null> {
    const { data, error } = await this.client
      .from('seeed_t1000')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching seeed_t1000 by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<SeeedT1000[]> {
    const { data, error } = await this.client
      .from('seeed_t1000')
      .select('*');

    if (error) {
      console.error('Error fetching all seeed_t1000:', error.message);
      return [];
    }

    return data;
  }

  async insert(device: SeeedT1000Insert): Promise<SeeedT1000 | null> {
    const { data, error } = await this.client
      .from('seeed_t1000')
      .insert(device)
      .single();

    if (error) {
      console.error('Error inserting seeed_t1000:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, device: SeeedT1000Update): Promise<SeeedT1000 | null> {
    const { data, error } = await this.client
      .from('seeed_t1000')
      .update(device)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating seeed_t1000:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('seeed_t1000')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting seeed_t1000:', error.message);
      return false;
    }

    return true;
  }
}

export default SeeedT1000Repository;
