import type { SupabaseClient } from '@supabase/supabase-js';
import CwRulesRepository from '$lib/repositories/CwRulesRepository';
import type { Tables } from '$lib/types/supabaseSchema';

type CwRules = Tables<'cw_rules'>;
type CwRulesInsert = Tables<'cw_rules'>;
type CwRulesUpdate = Tables<'cw_rules'>;

class CwRulesService {
  private repository: CwRulesRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwRulesRepository(client);
  }

  async getById(id: number): Promise<CwRules | null> {
    return await this.repository.findById(id);
  }

  async getAll(): Promise<CwRules[]> {
    return await this.repository.findAll();
  }

  async add(data: CwRulesInsert): Promise<CwRules | null> {
    return await this.repository.insert(data);
  }

  async update(id: number, data: CwRulesUpdate): Promise<CwRules | null> {
    return await this.repository.update(id, data);
  }

  async remove(id: number): Promise<boolean> {
    return await this.repository.delete(id);
  }
}

export default CwRulesService;
