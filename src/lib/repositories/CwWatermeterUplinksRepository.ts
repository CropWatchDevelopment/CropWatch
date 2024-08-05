import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwWatermeterUplinks = Tables<'cw_watermeter_uplinks'>;
type CwWatermeterUplinksInsert = Tables<'cw_watermeter_uplinks'>;
type CwWatermeterUplinksUpdate = Tables<'cw_watermeter_uplinks'>;

class CwWatermeterUplinksRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwWatermeterUplinks | null> {
    const { data, error } = await this.client
      .from('cw_watermeter_uplinks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_watermeter_uplinks by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwWatermeterUplinks[]> {
    const { data, error } = await this.client
      .from('cw_watermeter_uplinks')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_watermeter_uplinks:', error.message);
      return [];
    }

    return data;
  }

  async insert(watermeterUplink: CwWatermeterUplinksInsert): Promise<CwWatermeterUplinks | null> {
    const { data, error } = await this.client
      .from('cw_watermeter_uplinks')
      .insert(watermeterUplink)
      .single();

    if (error) {
      console.error('Error inserting cw_watermeter_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, watermeterUplink: CwWatermeterUplinksUpdate): Promise<CwWatermeterUplinks | null> {
    const { data, error } = await this.client
      .from('cw_watermeter_uplinks')
      .update(watermeterUplink)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_watermeter_uplinks:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_watermeter_uplinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_watermeter_uplinks:', error.message);
      return false;
    }

    return true;
  }
}

export default CwWatermeterUplinksRepository;
