import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwDeviceOwners = Tables<'cw_device_owners'>;
type CwDeviceOwnersInsert = Tables<'cw_device_owners'>;
type CwDeviceOwnersUpdate = Tables<'cw_device_owners'>;

class CwDeviceOwnersRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwDeviceOwners | null> {
    const { data, error } = await this.client
      .from('cw_device_owners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_device_owners by id:', error.message);
      return null;
    }

    return data;
  }

  async findByDeviceEui(dev_eui: string): Promise<CwDeviceOwners[]> {
    const { data, error } = await this.client
      .from('cw_device_owners')
      .select('*')
      .eq('dev_eui', dev_eui);

    if (error) {
      console.error('Error fetching owners by device ID:', error.message);
      return [];
    }

    return data;
  }

  async findAll(): Promise<CwDeviceOwners[]> {
    const { data, error } = await this.client
      .from('cw_device_owners')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_device_owners:', error.message);
      return [];
    }

    return data;
  }

  async insert(owner: CwDeviceOwnersInsert): Promise<CwDeviceOwners | null> {
    const { data, error } = await this.client
      .from('cw_device_owners')
      .insert(owner)
      .single();

    if (error) {
      console.error('Error inserting cw_device_owners:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, owner: CwDeviceOwnersUpdate): Promise<CwDeviceOwners | null> {
    const { data, error } = await this.client
      .from('cw_device_owners')
      .update(owner)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_device_owners:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_device_owners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_device_owners:', error.message);
      return false;
    }

    return true;
  }
}

export default CwDeviceOwnersRepository;
