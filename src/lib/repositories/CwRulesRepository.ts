import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwRules = Tables<'cw_rules'>;
type CwRulesInsert = Tables<'cw_rules'>;
type CwRulesUpdate = Tables<'cw_rules'>;

class CwRulesRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwRules | null> {
    const { data, error } = await this.client
      .from('cw_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_rules by id:', error.message);
      return null;
    }

    return data;
  }

  async findByDevEui(devEui: string): Promise<CwRules[] | null> {
    const { data, error } = await this.client
      .from('cw_rules')
      .select('*')
      .eq('dev_eui', devEui)
      .select();

    if (error) {
      console.error('Error fetching cw_rules by dev_eui:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwRules[]> {
    const { data, error } = await this.client
      .from('cw_rules')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_rules:', error.message);
      return [];
    }

    return data;
  }

  async findAllBySubscription(email: string): Promise<CwRules[]> {
    const { data, error } = await this.client
      .from('cw_rules')
      .select('*')
      .contains('action_recipient', email);

    if (error) {
      console.error('Error fetching all cw_rules:', error.message);
      return [];
    }

    return data;
  }

  async insert(rule: CwRulesInsert): Promise<CwRules | null> {
    const { data, error } = await this.client
      .from('cw_rules')
      .insert(rule)
      .single();

    if (error) {
      console.error('Error inserting cw_rules:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, rule: CwRulesUpdate): Promise<CwRules | null> {
    const { data, error } = await this.client
      .from('cw_rules')
      .update(rule)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_rules:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_rules:', error.message);
      return false;
    }

    return true;
  }
}

export default CwRulesRepository;
