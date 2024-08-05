import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwGateways = Tables<'cw_gateways'>;
type CwGatewaysInsert = Tables<'cw_gateways'>;
type CwGatewaysUpdate = Tables<'cw_gateways'>;

class CwGatewaysRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwGateways | null> {
    const { data, error } = await this.client
      .from('cw_gateways')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_gateways by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwGateways[]> {
    const { data, error } = await this.client
      .from('cw_gateways')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_gateways:', error.message);
      return [];
    }

    return data;
  }

  async insert(gateway: CwGatewaysInsert): Promise<CwGateways | null> {
    const { data, error } = await this.client
      .from('cw_gateways')
      .insert(gateway)
      .single();

    if (error) {
      console.error('Error inserting cw_gateways:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, gateway: CwGatewaysUpdate): Promise<CwGateways | null> {
    const { data, error } = await this.client
      .from('cw_gateways')
      .update(gateway)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_gateways:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_gateways')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_gateways:', error.message);
      return false;
    }

    return true;
  }
}

export default CwGatewaysRepository;
