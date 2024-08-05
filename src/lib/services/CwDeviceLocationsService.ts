import type { SupabaseClient } from '@supabase/supabase-js';
import CwDeviceLocationsRepository from '$lib/repositories/CwDeviceLocationsRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwDeviceLocations = Tables<'cw_device_locations'>;
type CwDeviceLocationsInsert = Tables<'cw_device_locations'>;
type CwDeviceLocationsUpdate = Tables<'cw_device_locations'>;

class CwDeviceLocationsService {
  private repository: CwDeviceLocationsRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwDeviceLocationsRepository(client);
  }

  async getDeviceLocationById(id: number): Promise<CwDeviceLocations | null> {
    return await this.repository.findById(id);
  }

  async getByDeviceId(dev_eui: string): Promise<CwDeviceLocations | null> {
    return await this.repository.findByDeviceEui(dev_eui);
  }

  async getAllDeviceLocations(): Promise<CwDeviceLocations[]> {
    return await this.repository.findAll();
  }

  async addDeviceLocation(location: CwDeviceLocationsInsert): Promise<CwDeviceLocations | null> {
    return await this.repository.insert(location);
  }

  async updateDeviceLocation(id: number, location: CwDeviceLocationsUpdate): Promise<CwDeviceLocations | null> {
    return await this.repository.update(id, location);
  }

  async removeDeviceLocation(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwDeviceLocationsService;
