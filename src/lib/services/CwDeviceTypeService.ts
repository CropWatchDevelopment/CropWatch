import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';
import CwDeviceTypeRepository from '$lib/repositories/CwDeviceTypeRepository';

type CwDeviceType = Tables<'cw_device_type'>;
type CwDeviceTypeInsert = Tables<'cw_device_type'>;
type CwDeviceTypeUpdate = Tables<'cw_device_type'>;

class CwDeviceTypeService {
  private repository: CwDeviceTypeRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwDeviceTypeRepository(client);
  }

  async getById(id: number): Promise<CwDeviceType | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwDeviceType[]> {
    return await this.repository.findAll();
  }

  // async add(data: CwDeviceTypeInsert): Promise<CwDeviceType | null> {
  //   return await this.repository.insert(data);
  // }

  // async update(id: number, data: CwDeviceTypeUpdate): Promise<CwDeviceType | null> {
  //   return await this.repository.update(id, data);
  // }

  // async remove(id: number): Promise<boolean> {
  //   return await this.repository.delete(id);
  // }
}

export default CwDeviceTypeService;
