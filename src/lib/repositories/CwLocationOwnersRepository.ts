import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocationOwners = Tables<'cw_location_owners'>;
type CwLocationOwnersInsert = Tables<'cw_location_owners'>;
type CwLocationOwnersUpdate = Tables<'cw_location_owners'>;

class CwLocationOwnersRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwLocationOwners | null> {
    const { data, error } = await this.client
      .from('cw_location_owners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_location_owners by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(id: number): Promise<CwLocationOwners[]> {
    const { data, error } = await this.client
      .from('cw_location_owners')
      .select('*')
      .eq('location_id', id);

    if (error) {
      console.error('Error fetching all cw_location_owners:', error.message);
      return [];
    }

    return data;
  }

  async insert(owner: CwLocationOwnersInsert): Promise<CwLocationOwners | null> {
    const { data, error } = await this.client
      .from('cw_location_owners')
      .insert(owner)
      .single();

    if (error) {
      console.error('Error inserting cw_location_owners:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, owner: CwLocationOwnersUpdate): Promise<CwLocationOwners | null> {
    const { data, error } = await this.client
      .from('cw_location_owners')
      .update(owner)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_location_owners:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_location_owners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_location_owners:', error.message);
      return false;
    }

    return true;
  }
}

export default CwLocationOwnersRepository;
