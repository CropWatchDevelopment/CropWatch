import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwRuleCriteria = Tables<'cw_rule_criteria'>;
type CwRuleCriteriaInsert = Tables<'cw_rule_criteria'>;
type CwRuleCriteriaUpdate = Tables<'cw_rule_criteria'>;

class CwRuleCriteriaRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwRuleCriteria | null> {
    const { data, error } = await this.client
      .from('cw_rule_criteria')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_rule_criteria by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwRuleCriteria[]> {
    const { data, error } = await this.client
      .from('cw_rule_criteria')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_rule_criteria:', error.message);
      return [];
    }

    return data;
  }

  async insert(ruleCriteria: CwRuleCriteriaInsert): Promise<CwRuleCriteria | null> {
    const { data, error } = await this.client
      .from('cw_rule_criteria')
      .insert(ruleCriteria)
      .single();

    if (error) {
      console.error('Error inserting cw_rule_criteria:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, ruleCriteria: CwRuleCriteriaUpdate): Promise<CwRuleCriteria | null> {
    const { data, error } = await this.client
      .from('cw_rule_criteria')
      .update(ruleCriteria)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_rule_criteria:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_rule_criteria')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_rule_criteria:', error.message);
      return false;
    }

    return true;
  }
}

export default CwRuleCriteriaRepository;
