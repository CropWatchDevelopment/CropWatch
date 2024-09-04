import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwDeviceLocations = Tables<'cw_device_locations'>;
type CwDeviceLocationsInsert = Tables<'cw_device_locations'>;
type CwDeviceLocationsUpdate = Tables<'cw_device_locations'>;

class CwDeviceLocationsRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwDeviceLocations | null> {
    const { data, error } = await this.client
      .from('cw_device_locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_device_locations by id:', error.message);
      return null;
    }

    return data;
  }

  async findByDeviceEui(dev_eui: string): Promise<CwDeviceLocations | null> {
    const { data, error } = await this.client
      .from('cw_device_locations')
      .select('*')
      .eq('dev_eui', dev_eui)
      .single();

    if (error) {
      console.error('Error fetching device location by device ID:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwDeviceLocations[]> {
    const { data, error } = await this.client
      .from('cw_device_locations')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_device_locations:', error.message);
      return [];
    }

    return data;
  }

  async insert(location: CwDeviceLocationsInsert): Promise<CwDeviceLocations | null> {
    const { data, error } = await this.client
      .from('cw_device_locations')
      .insert(location)
      .select()
      .single();

    if (error) {
      console.error('Error inserting cw_device_locations:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, location: CwDeviceLocationsUpdate): Promise<CwDeviceLocations | null> {
    const { data, error } = await this.client
      .from('cw_device_locations')
      .update(location)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_device_locations:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_device_locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_device_locations:', error.message);
      return false;
    }

    return true;
  }
}

export default CwDeviceLocationsRepository;
