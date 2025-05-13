import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IRuleService } from '$lib/interfaces/IRuleService';
import { toRuleDto } from '$lib/dtos/RuleDto';
import type { RuleUpdate } from '$lib/models/Rule';

/**
 * GET handler to retrieve a specific rule
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const ruleId = parseInt(params.ruleId);

    if (isNaN(ruleId)) {
      return json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    // Get rule service from IoC container
    const ruleService = container.get<IRuleService>(TYPES.RuleService);
    const rule = await ruleService.getRuleById(ruleId);

    if (!rule) {
      return json({ error: 'Rule not found' }, { status: 404 });
    }

    return json({ rule: toRuleDto(rule) });
  } catch (error) {
    console.error('Error retrieving rule:', error);
    return json({ error: 'Failed to retrieve rule' }, { status: 500 });
  }
};

/**
 * PUT handler to update a specific rule
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const ruleId = parseInt(params.ruleId);
    const data = await request.json();

    if (isNaN(ruleId)) {
      return json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    if (!data.rule) {
      return json({ error: 'Rule data is required' }, { status: 400 });
    }

    // Get rule service from IoC container
    const ruleService = container.get<IRuleService>(TYPES.RuleService);

    // Update rule
    const ruleData: RuleUpdate = data.rule;
    const updatedRule = await ruleService.updateRule(ruleId, ruleData);

    if (!updatedRule) {
      return json({ error: 'Rule not found' }, { status: 404 });
    }

    return json({ rule: toRuleDto(updatedRule) });
  } catch (error) {
    console.error('Error updating rule:', error);
    return json({ error: 'Failed to update rule' }, { status: 500 });
  }
};

/**
 * DELETE handler to delete a specific rule
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const ruleId = parseInt(params.ruleId);

    if (isNaN(ruleId)) {
      return json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    // Get rule service from IoC container
    const ruleService = container.get<IRuleService>(TYPES.RuleService);
    const deleted = await ruleService.deleteRule(ruleId);

    if (!deleted) {
      return json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return json({ error: 'Failed to delete rule' }, { status: 500 });
  }
};