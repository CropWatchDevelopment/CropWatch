// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleService } from '../../services/RuleService';
import { RuleRepository } from '../../repositories/RuleRepository';
import { createMockSupabaseClient, createErrorMockSupabaseClient } from '../mocks/MockSupabase';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';
import type { Rule, RuleCriteria, RuleWithCriteria } from '../../models/Rule';

describe('RuleService', () => {
	// Mock data
	const mockRules: Rule[] = [
		{
			id: 1,
			ruleGroupId: 'rule-group-1',
			name: 'High Temperature Alert',
			description: 'Alert when temperature exceeds threshold',
			dev_eui: 'device-001',
			profile_id: 'profile-123',
			is_active: true,
			severity: 'high',
			notifier_type: 'notification',
			message: 'Temperature is too high!',
			created_at: '2025-05-01T10:00:00Z'
		},
		{
			id: 2,
			ruleGroupId: 'rule-group-2',
			name: 'Low Moisture Alert',
			description: 'Alert when moisture falls below threshold',
			dev_eui: 'device-001',
			profile_id: 'profile-123',
			is_active: true,
			severity: 'medium',
			notifier_type: 'notification',
			message: 'Soil moisture is too low!',
			created_at: '2025-05-01T11:00:00Z'
		}
	] as Rule[];

	const mockCriteria: RuleCriteria[] = [
		{
			id: 1,
			ruleGroupId: 'rule-group-1',
			sensor_type: 'temperature',
			operator: '>',
			value: 30,
			unit: 'C',
			created_at: '2025-05-01T10:05:00Z'
		},
		{
			id: 2,
			ruleGroupId: 'rule-group-2',
			sensor_type: 'moisture',
			operator: '<',
			value: 20,
			unit: '%',
			created_at: '2025-05-01T11:05:00Z'
		}
	] as RuleCriteria[];

	// Mock implementations
	let ruleService: RuleService;
	let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
	let ruleRepository: RuleRepository;
	let errorHandlingService: ErrorHandlingService;

	beforeEach(() => {
		// Create test mocks
		mockSupabase = createMockSupabaseClient({
			cw_rules: mockRules,
			cw_rule_criteria: mockCriteria
		});

		errorHandlingService = new ErrorHandlingService();
		vi.spyOn(errorHandlingService, 'logError');

		ruleRepository = new RuleRepository(mockSupabase, errorHandlingService);
		ruleService = new RuleService(ruleRepository);
	});

	describe('getRuleById', () => {
		it('should return a rule by its ID', async () => {
			vi.spyOn(ruleRepository, 'findById').mockResolvedValue(mockRules[0]);

			const rule = await ruleService.getRuleById(1);
			expect(rule).not.toBeNull();
			expect(rule?.id).toBe(1);
			expect(rule?.name).toBe('High Temperature Alert');
		});

		it('should return null for non-existent rule ID', async () => {
			vi.spyOn(ruleRepository, 'findById').mockResolvedValue(null);

			const rule = await ruleService.getRuleById(999);
			expect(rule).toBeNull();
		});
	});

	describe('getRuleWithCriteria', () => {
		it('should return a rule with its associated criteria', async () => {
			const mockRuleWithCriteria: RuleWithCriteria = {
				...mockRules[0],
				criteria: [mockCriteria[0]]
			};

			vi.spyOn(ruleRepository, 'findRuleWithCriteria').mockResolvedValue(mockRuleWithCriteria);

			const rule = await ruleService.getRuleWithCriteria('rule-group-1');
			expect(rule).not.toBeNull();
			expect(rule?.name).toBe('High Temperature Alert');
			expect(rule?.criteria).toHaveLength(1);
			expect(rule?.criteria[0].sensor_type).toBe('temperature');
		});
	});

	describe('getRulesByDevice', () => {
		it('should return rules for a specific device', async () => {
			vi.spyOn(ruleRepository, 'findByDevice').mockResolvedValue(mockRules);

			const rules = await ruleService.getRulesByDevice('device-001');
			expect(rules).toHaveLength(2);
			expect(rules[0].dev_eui).toBe('device-001');
		});
	});

	describe('getRulesByProfile', () => {
		it('should return rules for a specific profile', async () => {
			vi.spyOn(ruleRepository, 'findByProfile').mockResolvedValue(mockRules);

			const rules = await ruleService.getRulesByProfile('profile-123');
			expect(rules).toHaveLength(2);
			expect(rules[0].profile_id).toBe('profile-123');
		});
	});

	describe('getRuleCriteriaByGroup', () => {
		it('should return criteria for a specific rule group', async () => {
			vi.spyOn(ruleRepository, 'findCriteriaByGroup').mockResolvedValue([mockCriteria[0]]);

			const criteria = await ruleService.getRuleCriteriaByGroup('rule-group-1');
			expect(criteria).toHaveLength(1);
			expect(criteria[0].ruleGroupId).toBe('rule-group-1');
		});
	});

	describe('createRule', () => {
		it('should create a new rule', async () => {
			const newRule = {
				ruleGroupId: 'rule-group-3',
				name: 'New Test Rule',
				description: 'Test rule description',
				dev_eui: 'device-002',
				profile_id: 'profile-123',
				is_active: true
			};

			vi.spyOn(ruleRepository, 'create').mockResolvedValue({
				id: 3,
				...newRule,
				severity: null,
				notifier_type: null,
				message: null,
				created_at: '2025-05-02T12:00:00Z'
			} as Rule);

			const createdRule = await ruleService.createRule(newRule);
			expect(createdRule.id).toBe(3);
			expect(createdRule.name).toBe('New Test Rule');
			expect(ruleRepository.create).toHaveBeenCalledWith(newRule);
		});
	});

	describe('createRuleCriteria', () => {
		it('should create a new rule criteria', async () => {
			const newCriteria = {
				ruleGroupId: 'rule-group-1',
				sensor_type: 'humidity',
				operator: '>',
				value: 80
			};

			vi.spyOn(ruleRepository, 'createCriteria').mockResolvedValue({
				id: 3,
				...newCriteria,
				unit: '%',
				created_at: '2025-05-02T12:00:00Z'
			} as RuleCriteria);

			const createdCriteria = await ruleService.createRuleCriteria(newCriteria);
			expect(createdCriteria.id).toBe(3);
			expect(createdCriteria.sensor_type).toBe('humidity');
			expect(ruleRepository.createCriteria).toHaveBeenCalledWith(newCriteria);
		});
	});

	describe('createRuleWithCriteria', () => {
		it('should create a rule with associated criteria', async () => {
			const newRule = {
				ruleGroupId: 'rule-group-4',
				name: 'Combined Rule',
				description: 'Test combined rule',
				dev_eui: 'device-003',
				profile_id: 'profile-456',
				is_active: true
			};

			const newCriteria = [
				{
					sensor_type: 'temperature',
					operator: '>',
					value: 25,
					unit: 'C'
				},
				{
					sensor_type: 'humidity',
					operator: '<',
					value: 40,
					unit: '%'
				}
			];

			// Mock the rule creation
			vi.spyOn(ruleService, 'createRule').mockResolvedValue({
				id: 4,
				...newRule,
				severity: null,
				notifier_type: null,
				message: null,
				created_at: '2025-05-02T12:00:00Z'
			} as Rule);

			// Mock the criteria creation
			vi.spyOn(ruleService, 'createRuleCriteria')
				.mockResolvedValueOnce({
					id: 5,
					ruleGroupId: newRule.ruleGroupId,
					...newCriteria[0],
					created_at: '2025-05-02T12:00:00Z'
				} as RuleCriteria)
				.mockResolvedValueOnce({
					id: 6,
					ruleGroupId: newRule.ruleGroupId,
					...newCriteria[1],
					created_at: '2025-05-02T12:00:00Z'
				} as RuleCriteria);

			const result = await ruleService.createRuleWithCriteria(newRule, newCriteria);

			expect(result.id).toBe(4);
			expect(result.name).toBe('Combined Rule');
			expect(result.criteria).toHaveLength(2);
			expect(result.criteria[0].sensor_type).toBe('temperature');
			expect(result.criteria[1].sensor_type).toBe('humidity');

			expect(ruleService.createRule).toHaveBeenCalledWith(newRule);
			expect(ruleService.createRuleCriteria).toHaveBeenCalledTimes(2);
		});
	});

	describe('updateRule', () => {
		it('should update an existing rule', async () => {
			const updateData = {
				name: 'Updated Rule Name',
				is_active: false
			};

			vi.spyOn(ruleRepository, 'update').mockResolvedValue({
				...mockRules[0],
				...updateData
			});

			const updatedRule = await ruleService.updateRule(1, updateData);
			expect(updatedRule?.name).toBe('Updated Rule Name');
			expect(updatedRule?.is_active).toBe(false);
			expect(ruleRepository.update).toHaveBeenCalledWith(1, updateData);
		});
	});

	describe('deleteRule', () => {
		it('should delete a rule and its criteria', async () => {
			vi.spyOn(ruleRepository, 'findById').mockResolvedValue(mockRules[0]);
			vi.spyOn(ruleRepository, 'deleteCriteriaByGroup').mockResolvedValue(true);
			vi.spyOn(ruleRepository, 'delete').mockResolvedValue(true);

			const result = await ruleService.deleteRule(1);

			expect(result).toBe(true);
			expect(ruleRepository.deleteCriteriaByGroup).toHaveBeenCalledWith('rule-group-1');
			expect(ruleRepository.delete).toHaveBeenCalledWith(1);
		});

		it('should return true when deleting non-existent rule', async () => {
			vi.spyOn(ruleRepository, 'findById').mockResolvedValue(null);
			vi.spyOn(ruleRepository, 'deleteCriteriaByGroup').mockResolvedValue(true);
			vi.spyOn(ruleRepository, 'delete').mockResolvedValue(true);

			const result = await ruleService.deleteRule(999);
			expect(result).toBe(true);
			expect(ruleRepository.deleteCriteriaByGroup).not.toHaveBeenCalled();
			expect(ruleRepository.delete).not.toHaveBeenCalled();
		});
	});

	describe('deleteRuleCriteria', () => {
		it('should delete a rule criteria', async () => {
			vi.spyOn(ruleRepository, 'deleteCriteria').mockResolvedValue(true);

			const result = await ruleService.deleteRuleCriteria(1);
			expect(result).toBe(true);
			expect(ruleRepository.deleteCriteria).toHaveBeenCalledWith(1);
		});
	});
});
