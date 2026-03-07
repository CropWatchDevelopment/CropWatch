// appContext.ts
import { getContext, setContext } from 'svelte';
import type { IJWT } from './interfaces/jwt.interface';
import type { IDevice } from './interfaces/device.interface';
import type { IRule } from './interfaces/rule.interface';
import { createCwAlarmScheduler } from '@cropwatchdevelopment/cwui';
import type { RuleDto, TriggeredRulesCountResponse } from './api/api.service';
import type { LocationDto } from './api/api.dtos';

const DEVICE_STALE_MINUTES = 10;
const deviceAlarms = createCwAlarmScheduler();

const app = createAppContext();

export interface AppContext {
	session: IJWT | null;
	devices: IDevice[];
	deviceGroups?: string[];
	locationGroups?: string[];
	locations?: LocationDto[];
	deviceStatuses: { online: number; offline: number };
	totalDeviceCount?: number;
	rules: IRule[];
	triggeredRules: RuleDto[];
	triggeredRulesCount: number;
	staleDeviceIds: string[];
	accessToken?: string;
	drawerOpen?: boolean;
}

export const appContextKey = Symbol('appContext');

export const defaultAppContext: AppContext = {
	session: null,
	devices: [],
	deviceStatuses: { online: 0, offline: 0 },
	totalDeviceCount: 0,
	rules: [],
	triggeredRules: [],
	triggeredRulesCount: 0,
	staleDeviceIds: [],
	locationGroups: [],
	accessToken: undefined,
	drawerOpen: false,
};

export function createAppContext(initial: Partial<AppContext> = {}): AppContext {

	// Check if context already exists to avoid overwriting it (e.g. during hot reload)
	try {
		const existing = getContext<AppContext>(appContextKey);
		if (existing) {
			return existing;
		} else {
			return {
				session: null,
				devices: [],
				deviceStatuses: { online: 0, offline: 0 },
				totalDeviceCount: 0,
				rules: [],
				triggeredRules: [],
				triggeredRulesCount: 0,
				accessToken: undefined,
				staleDeviceIds: [],
				locationGroups: [],
				drawerOpen: false,
				...initial
			};
		}
	} catch {
		// No existing context, will create a new one
		return {
			session: null,
			devices: [],
			deviceStatuses: { online: 0, offline: 0 },
			totalDeviceCount: 0,
			rules: [],
			triggeredRules: [],
			triggeredRulesCount: 0,
			accessToken: undefined,
			staleDeviceIds: [],
			locationGroups: [],
			drawerOpen: false,
			...initial
		};
	}
}

export function setAppContext(context: AppContext) {
	setContext(appContextKey, context);
}

export function getAppContext(): AppContext {
	return getContext(appContextKey);
}

export function updateAppContext(updates: Partial<AppContext>) {
	Object.assign(app, updates);
}
