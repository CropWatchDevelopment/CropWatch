import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwDeviceType = Tables<'cw_device_type'>;
type CwDeviceTypeInsert = Tables<'cw_device_type'>;
type CwDeviceTypeUpdate = Tables<'cw_device_type'>;

class CwDeviceTypeRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwDeviceType | null> {
    const { data, error } = await this.client
      .from('cw_device_type')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_device_type by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwDeviceType[]> {
    const { data, error } = await this.client
      .from('cw_device_type')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_device_type:', error.message);
      return [];
    }

    return data;
  }

  // async insert(deviceType: CwDeviceTypeInsert): Promise<CwDeviceType | null> {
  //   const { data, error } = await this.client
  //     .from('cw_device_type')
  //     .insert(deviceType)
  //     .single();

  //   if (error) {
  //     console.error('Error inserting cw_device_type:', error.message);
  //     return null;
  //   }

  //   return data;
  // }

  // async update(id: number, deviceType: CwDeviceTypeUpdate): Promise<CwDeviceType | null> {
  //   const { data, error } = await this.client
  //     .from('cw_device_type')
  //     .update(deviceType)
  //     .eq('id', id)
  //     .single();

  //   if (error) {
  //     console.error('Error updating cw_device_type:', error.message);
  //     return null;
  //   }

  //   return data;
  // }

  // async delete(id: number): Promise<boolean> {
  //   const { error } = await this.client
  //     .from('cw_device_type')
  //     .delete()
  //     .eq('id', id);

  //   if (error) {
  //     console.error('Error deleting cw_device_type:', error.message);
  //     return false;
  //   }

  //   return true;
  // }
}

export default CwDeviceTypeRepository;
