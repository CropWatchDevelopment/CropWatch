export interface IRule {
    id: number;
    name: string;
    action_recipient: string;
    notifier_type: number;
    ruleGroupId: string;
    profile_id: string;
    dev_eui: string;
    send_using: string;
    is_triggered: boolean;
    trigger_count: number;
    created_at: Date;
    last_triggered: Date | null;
    cw_rule_criteria: CwRuleCriterum[];
}

export interface CwRuleCriterum {
    created_at: Date;
    criteria_id: string;
    id: number;
    operator: string;
    parent_id: string;
    reset_value: number;
    ruleGroupId: string;
    subject: string;
    trigger_value: number;
}