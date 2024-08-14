import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocations = Tables<'cw_locations'>;

class CwLocationsRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(location_id: number): Promise<CwLocations | null> {
    const { data, error } = await this.client
      .from('cw_locations')
      .select('*')
      .eq('location_id', location_id)
      .single();

    if (error) {
      console.error('Error fetching location by ID:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwLocations[]> {
    const { data, error } = await this.client.from('cw_locations').select('*');

    if (error) {
      console.error('Error fetching all locations:', error.message);
      return [];
    }

    return data;
  }

  async insert(location: CwLocations): Promise<CwLocations | null> {
    const { data, error } = await this.client
      .from('cw_locations')
      .insert(location)
      .single();

    if (error) {
      console.error('Error inserting location:', error.message);
      return null;
    }

    return data;
  }

  async update(location_id: number, location: CwLocations): Promise<CwLocations | null> {
    const { data, error } = await this.client
      .from('cw_locations')
      .update(location)
      .eq('location_id', location_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error.message);
      return null;
    }

    return data;
  }

  async delete(location_id: number): Promise<boolean> {
    const { error } = await this.client.from('cw_locations').delete().eq('location_id', location_id);

    if (error) {
      console.error('Error deleting location:', error.message);
      return false;
    }

    return true;
  }
}

export default CwLocationsRepository;
