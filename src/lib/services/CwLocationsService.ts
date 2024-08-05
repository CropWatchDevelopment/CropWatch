import type { SupabaseClient } from '@supabase/supabase-js';
import CwLocationsRepository from '$lib/repositories/CwLocationsRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocations = Tables<'cw_locations'>;
type CwLocationsInsert = Tables<'cw_locations'>;
type CwLocationsUpdate = Tables<'cw_locations'>;

class CwLocationsService {
  private repository: CwLocationsRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwLocationsRepository(client);
  }

  async getLocationById(location_id: number): Promise<CwLocations | null> {
    return await this.repository.findById(location_id);
  }

  async getAllLocations(): Promise<CwLocations[]> {
    return await this.repository.findAll();
  }

  async addLocation(location: CwLocationsInsert): Promise<CwLocations | null> {
    return await this.repository.insert(location);
  }

  async updateLocation(location_id: number, location: CwLocationsUpdate): Promise<CwLocations | null> {
    return await this.repository.update(location_id, location);
  }

  async removeLocation(location_id: number): Promise<boolean> {
    return await this.repository.delete(location_id);
  }
}

export default CwLocationsService;
