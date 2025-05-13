import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import type { IRuleService } from '$lib/interfaces/IRuleService';
import type { Rule, RuleUpdate, RuleInsert, RuleCriteriaInsert, RuleCriteriaUpdate } from '$lib/models/Rule';
import type { IDeviceService } from '$lib/interfaces/IDeviceService';
import type { ISessionService } from '$lib/interfaces/ISessionService';

/**
 * Load function to fetch device rules
 */
export const load: PageServerLoad = async ({ params }) => {
    try {
        const devEui = params.devEui;
        const locationId = params.location_id;

        return {
            devEui,
            locationId,
        }
    } catch (err) {
        console.error('Error loading device rules:', err);
        throw error(500, 'Internal Server Error');
    }
}