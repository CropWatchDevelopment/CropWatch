import { z } from 'zod';

export const RuleAddSchema = z.object({
    name: z.string().min(3).max(255),
    action_recipient: z.string().min(3).max(255),
    dev_eui: z.string().min(16).max(16),
    is_triggered: z.boolean().default(false),
    profile_id: z.string(),
    ruleGroupId: z.string(),
    notifier_type: z.number().default(1),
    cw_rule_criteria: z.object({
        // id: z.number(),
        ruleGroupId: z.string(),
        subject: z.string().default(''),
        operator: z.string().default(''),
        trigger_value: z.number(),
        reset_value: z.number(),
    }).array() //.nonempty('You must have at least ONE criteria'),
});