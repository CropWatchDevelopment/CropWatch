import type { SupabaseClient } from '@supabase/supabase-js';
import NetvoxRa02aRepository from '$lib/repositories/NetvoxRa02aRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type NetvoxRa02a = Tables<'netvox_ra02a'>;
type NetvoxRa02aInsert = Tables<'netvox_ra02a'>;
type NetvoxRa02aUpdate = Tables<'netvox_ra02a'>;

class NetvoxRa02aService {
  private repository: NetvoxRa02aRepository;

  constructor(client: SupabaseClient) {
    this.repository = new NetvoxRa02aRepository(client);
  }

  async getById(id: number): Promise<NetvoxRa02a | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<NetvoxRa02a[]> {
    return await this.repository.findAll();
  }

  async add(data: NetvoxRa02aInsert): Promise<NetvoxRa02a | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: NetvoxRa02aUpdate): Promise<NetvoxRa02a | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default NetvoxRa02aService;
