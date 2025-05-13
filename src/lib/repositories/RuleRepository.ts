import { inject, injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { 
  Rule, 
  RuleInsert, 
  RuleUpdate, 
  RuleCriteria, 
  RuleCriteriaInsert,
  RuleWithCriteria,
  RuleCriteriaUpdate
} from '../models/Rule';
import { TYPES } from '../server/ioc.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for rule and rule criteria data access
 */
@injectable()
export class RuleRepository extends BaseRepository<Rule, number> {
  protected tableName = 'cw_rules';
  protected primaryKey = 'id';
  protected entityName = 'Rule';
  protected criteriaTable = 'cw_rule_criteria';

  /**
   * Constructor with Supabase client and error handler dependencies
   */
  constructor(
    @inject(TYPES.SupabaseClient) supabase: SupabaseClient,
    @inject(ErrorHandlingService) errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }

  /**
   * Find rules by device EUI
   * @param devEui The device EUI
   */
  async findByDevice(devEui: string): Promise<Rule[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`*, cw_rule_criteria(*)`)
      .eq('dev_eui', devEui)
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding rules by device EUI: ${devEui}`
      );
    }
    
    return data as Rule[] || [];
  }

  /**
   * Find rules and rule Criteria by device EUI
   * @param devEui The device EUI
   */
  async getRulesAndCriteriaByDevice(devEui: string): Promise<RuleWithCriteria | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        cw_rule_criteria(*)
      `)
      .eq('dev_eui', devEui)
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding rules by device EUI: ${devEui}`
      );
    }
    
    return data as Rule[] || [];
  }

  /**
   * Find rules by profile ID
   * @param profileId The profile ID
   */
  async findByProfile(profileId: string): Promise<Rule[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('profile_id', profileId)
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding rules by profile ID: ${profileId}`
      );
    }
    
    return data as Rule[] || [];
  }

  /**
   * Find active rules
   */
  async findActive(): Promise<Rule[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error finding active rules'
      );
    }
    
    return data as Rule[] || [];
  }

  /**
   * Find rule by rule group ID
   * @param ruleGroupId The rule group ID
   */
  async findByRuleGroup(ruleGroupId: string): Promise<Rule | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('ruleGroupId', ruleGroupId)
      .single();
      
    if (error) {
      // For "no rows found" error, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding rule by rule group ID: ${ruleGroupId}`
      );
    }
    
    return data as Rule;
  }

  /**
   * Find criteria by rule group ID
   * @param ruleGroupId The rule group ID
   */
  async findCriteriaByGroup(ruleGroupId: string): Promise<RuleCriteria[]> {
    const { data, error } = await this.supabase
      .from(this.criteriaTable)
      .select('*')
      .eq('ruleGroupId', ruleGroupId)
      .order('id');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding criteria by rule group ID: ${ruleGroupId}`
      );
    }
    
    return data as RuleCriteria[] || [];
  }

  /**
   * Find rule with its criteria
   * @param ruleGroupId The rule group ID
   */
  async findRuleWithCriteria(ruleGroupId: string): Promise<RuleWithCriteria | null> {
    const rule = await this.findByRuleGroup(ruleGroupId);
    
    if (!rule) {
      return null;
    }
    
    const criteria = await this.findCriteriaByGroup(ruleGroupId);
    
    return {
      ...rule,
      criteria
    };
  }

  /**
   * Create a new rule
   * @param rule The rule to create
   */
  async create(rule: RuleInsert): Promise<Rule> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(rule)
      .select('*')
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error creating rule'
      );
    }
    
    return data as Rule;
  }

  /**
   * Create a new rule criteria
   * @param criteria The rule criteria to create
   */
  async createCriteria(criteria: RuleCriteriaInsert): Promise<RuleCriteria> {
    const { data, error } = await this.supabase
      .from(this.criteriaTable)
      .insert(criteria)
      .select()
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error creating rule criteria'
      );
    }
    
    return data as RuleCriteria;
  }

  /**
   * Update an existing rule
   * @param id The rule ID
   * @param rule The rule data to update
   */
  async update(id: number, rule: RuleUpdate): Promise<Rule | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(rule)
      .eq(this.primaryKey, id)
      .select('*')
      .single();
      
    if (error) {
      // For "no rows found" error, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      this.errorHandler.handleDatabaseError(
        error,
        `Error updating rule with ID: ${id}`
      );
    }
    
    return data as Rule;
  }

  /**
   * Update Criteria of an existing rule
   * @param id The rule ID
   * @param rule The rule data to update
   */
  async updateCriteria(id: number, rule: RuleCriteriaUpdate): Promise<RuleCriteria | null> {
    const { data, error } = await this.supabase
      .from(this.criteriaTable)
      .update(rule)
      .eq(this.primaryKey, id)
      .select('*')
      .single();
      
    if (error) {
      // For "no rows found" error, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      this.errorHandler.handleDatabaseError(
        error,
        `Error updating rule with ID: ${id}`
      );
    }
    
    return data as RuleCriteria;
  }

  /**
   * Delete a rule criteria
   * @param id The criteria ID to delete
   */
  async deleteCriteria(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.criteriaTable)
      .delete()
      .eq('id', id);
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error deleting rule criteria with ID: ${id}`
      );
    }
    
    return true;
  }

  /**
   * Delete all criteria for a rule group
   * @param ruleGroupId The rule group ID
   */
  async deleteCriteriaByGroup(ruleGroupId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.criteriaTable)
      .delete()
      .eq('ruleGroupId', ruleGroupId);
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error deleting criteria for rule group: ${ruleGroupId}`
      );
    }
    
    return true;
  }
}