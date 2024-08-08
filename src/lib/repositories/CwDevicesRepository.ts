import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwDevices = Tables<'cw_devices'>;

class CwDevicesRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findByLocationId(location_id: number): Promise<CwDevices[]> {
    const { data, error } = await this.client
      .from('cw_devices')
      .select('*')
      .eq('location_id', location_id);

    if (error) {
      console.error('Error fetching devices by location ID:', error.message);
      return [];
    }

    return data;
  }

  async findById(dev_eui: string): Promise<CwDevices | null> {
    const { data, error } = await this.client
      .from('cw_devices')
      .select('*')
      .eq('dev_eui', dev_eui)
      .single();

    if (error) {
      console.error('Error fetching device by ID:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwDevices[]> {
    const { data, error } = await this.client.from('cw_devices').select('*');

    if (error) {
      console.error('Error fetching all devices:', error.message);
      return [];
    }

    return data;
  }

  async findByDeviceEui(dev_eui: string): Promise<CwDevices | null> {
    const { data, error } = await this.client
      .from('cw_devices')
      .select('*')
      .eq('dev_eui', dev_eui)
      .single();

    if (error) {
      console.error('Error fetching device by EUI:', error.message);
      return null;
    }

    return data;
  }

  async findLatestDataByDevice(dev_eui: string, dataTable: string): Promise<CwDevices | null> {
    const { data, error } = await this.client
      .from(dataTable)
      .select('*')
      .eq('dev_eui', dev_eui)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(`Error fetching latest data from ${dataTable}:`, error.message);
      return null;
    }

    return data;
  }

  async findDataRangeByDevice(dev_eui: string, dataTable: string, firstDataDate: Date, lastDataDate: Date): Promise<CwDevices[] | null> {
    const { data, error } = await this.client
      .from(dataTable)
      .select('*')
      .eq('dev_eui', dev_eui)
      .gte('created_at', firstDataDate.toISOString())
      .lte('created_at', lastDataDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching latest data from ${dataTable}:`, error.message);
      return null;
    }

    return data;
  }

  async insert(device: CwDevices): Promise<CwDevices | null> {
    const { data, error } = await this.client
      .from('cw_devices')
      .insert(device)
      .single();

    if (error) {
      console.error('Error inserting device:', error.message);
      return null;
    }

    return data;
  }

  async update(dev_eui: string, device: CwDevices): Promise<CwDevices | null> {
    const { data, error } = await this.client
      .from('cw_devices')
      .update(device)
      .eq('dev_eui', dev_eui)
      .single();

    if (error) {
      console.error('Error updating device:', error.message);
      return null;
    }

    return data;
  }

  async delete(dev_eui: string): Promise<boolean> {
    const { error } = await this.client.from('cw_devices').delete().eq('dev_eui', dev_eui);

    if (error) {
      console.error('Error deleting device:', error.message);
      return false;
    }

    return true;
  }
}

export default CwDevicesRepository;
