

// src/routes/api/protected-route/+server.ts
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { json, error } from '@sveltejs/kit';

export const GET = async ({ url, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        // the user is not signed in
        throw error(401, { message: 'Unauthorized' })
    }


    let dev_eui = url.searchParams.get('dev_eui');

    const { data, error } = await supabase.from('cw_rules')
        .select('*, cw_rule_criteria(*)')
        .eq('dev_eui', dev_eui);

    console.log(data, error);

    return json(data);
}

export const POST = async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        // the user is not signed in
        throw error(401, { message: 'Unauthorized' })
    }

    const jsonData = await request.json();
    console.log('Raw JSON', jsonData);
    if (jsonData.ruleGroup === null) {
        return error(400, { message: 'Bad Request' });
    }

    await saveRule(jsonData.ruleGroup, supabase, session);
    await insertCriteria(jsonData.ruleGroup.root, supabase);

    return json({});
}

export const DELETE = async ({ url, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        // the user is not signed in
        throw error(401, { message: 'Unauthorized' })
    }

    let ruleId = url.searchParams.get('rule_id');

    if (ruleId === null) {
        return error(400, { message: 'Bad Request' });
    }

    const { data, error } = await supabase.from('cw_rules').delete().eq('id', ruleId);
    console.log(data, error);

    return json({ data, error }, { status: 200 });
}

export const PUT = async ({ url, request, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        // the user is not signed in
        throw error(401, { message: 'Unauthorized' })
    }

    let ruleId = url.searchParams.get('rule_id');
    const jsonData = await request.json();

    if (jsonData === null || ruleId === null) {
        return error(400, { message: 'Bad Request' });
    }

    const { data, error } = await supabase.from('cw_rules')
        .update({
            is_triggered: jsonData.reset,
        })
        .eq('id', ruleId)
        .select();

    return json({ data, error }, { status: (data && data.length > 0) ? 201 : 401 });
}



function insertCriteria(criteriaArray, supabase) {
    // Iterate over each criteria object in the array
    criteriaArray.forEach(criteria => {
        // Log the current criteria details
        // console.log(`ID: ${criteria.id}, Subject: ${criteria.subject}, Operator: ${criteria.operator}, Threshold: ${criteria.threshold_value}`);
        saveCriteria(criteria, supabase);
        // If the current criteria has children, recursively call this function on the children array
        if (criteria.children && criteria.children.length > 0) {
            insertCriteria(criteria.children, supabase);
        }
    });
}

async function saveRule(rule, supabase, session: Session) {
    const aboutToInsert = {
        profile_id: session.user.id,
        dev_eui: rule.dev_eui,
        name: rule.ruleName,
        babylon_notifier_type: 1,
        action_recipient: rule.action_recipient.join(),
        is_triggered: false,
        last_triggered: null,
        ruleGroupId: rule.groupId,
    };

    console.log('about to insert:', aboutToInsert);
    
    
    const { data, error } = await supabase.from('cw_rules').insert();
    if (error) {
        console.log('Failed to insert rule criteria', error);
        return false;
    }
    console.log('Rule Insert SUCCESS');
    return true;
}

async function saveCriteria(criteria, supabase) {
    console.log('criteria to save:', criteria);
    const { data, error } = await supabase.from('cw_rule_criteria').insert({
        subject: criteria.subject,
        operator: criteria.operator,
        trigger_value: criteria.threshold_value,
        reset_value: criteria.reset_value,
        ruleGroupId: criteria.ruleGroupId,
        parent_id: criteria.parent_id,

    });
    if (error) {
        console.log('Failed to insert rule criteria', error);
        return false;
    }
    return true;
}