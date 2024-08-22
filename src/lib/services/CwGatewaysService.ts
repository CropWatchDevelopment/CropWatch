import type { SupabaseClient } from '@supabase/supabase-js';
import CwGatewaysRepository from '$lib/repositories/CwGatewaysRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwGateways = Tables<'cw_gateways'>;
type CwGatewaysInsert = Tables<'cw_gateways'>;
type CwGatewaysUpdate = Tables<'cw_gateways'>;

class CwGatewaysService {
  private repository: CwGatewaysRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwGatewaysRepository(client);
  }

  async getById(id: number): Promise<CwGateways | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwGateways[]> {
    return await this.repository.findAll();
  }

  async add(data: CwGatewaysInsert): Promise<CwGateways | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwGatewaysUpdate): Promise<CwGateways | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwGatewaysService;
