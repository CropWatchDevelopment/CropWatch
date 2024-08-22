import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwSsTmepnpk = Tables<'cw_ss_tmepnpk'>;
type CwSsTmepnpkInsert = Tables<'cw_ss_tmepnpk'>;
type CwSsTmepnpkUpdate = Tables<'cw_ss_tmepnpk'>;

class CwSsTmepnpkRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwSsTmepnpk | null> {
    const { data, error } = await this.client
      .from('cw_ss_tmepnpk')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_ss_tmepnpk by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwSsTmepnpk[]> {
    const { data, error } = await this.client
      .from('cw_ss_tmepnpk')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_ss_tmepnpk:', error.message);
      return [];
    }

    return data;
  }

  async insert(ssTmepnpk: CwSsTmepnpkInsert): Promise<CwSsTmepnpk | null> {
    const { data, error } = await this.client
      .from('cw_ss_tmepnpk')
      .insert(ssTmepnpk)
      .single();

    if (error) {
      console.error('Error inserting cw_ss_tmepnpk:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, ssTmepnpk: CwSsTmepnpkUpdate): Promise<CwSsTmepnpk | null> {
    const { data, error } = await this.client
      .from('cw_ss_tmepnpk')
      .update(ssTmepnpk)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_ss_tmepnpk:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_ss_tmepnpk')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_ss_tmepnpk:', error.message);
      return false;
    }

    return true;
  }
}

export default CwSsTmepnpkRepository;
