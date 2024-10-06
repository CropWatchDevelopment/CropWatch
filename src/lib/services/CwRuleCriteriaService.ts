import type { SupabaseClient } from '@supabase/supabase-js';
import CwRuleCriteriaRepository from '$lib/repositories/CwRuleCriteriaRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwRuleCriteria = Tables<'cw_rule_criteria'>;
type CwRuleCriteriaInsert = Tables<'cw_rule_criteria'>;
type CwRuleCriteriaUpdate = Tables<'cw_rule_criteria'>;

class CwRuleCriteriaService {
  private repository: CwRuleCriteriaRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwRuleCriteriaRepository(client);
  }

  async getById(id: number): Promise<CwRuleCriteria | null> {
    return await this.repository.findById(id);
  }

  async getByRuleGroupId(id: string): Promise<CwRuleCriteria[] | null> {
    return await this.repository.findByRuleGroupId(id);
  }

  async getAll(groupId: string): Promise<CwRuleCriteria[]> {
    return await this.repository.findAll(groupId);
  }

  async add(data: CwRuleCriteriaInsert): Promise<CwRuleCriteria | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwRuleCriteriaUpdate): Promise<CwRuleCriteria | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwRuleCriteriaService;
