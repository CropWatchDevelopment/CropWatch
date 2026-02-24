// appContext.ts
import { getContext, setContext } from 'svelte';
import type { IJWT } from './interfaces/jwt.interface';
import type { IDevice } from './interfaces/device.interface';
import type { IRule } from './interfaces/rule.interface';
import { createCwAlarmScheduler } from '@cropwatchdevelopment/cwui';
import type { TriggeredRulesCountResponse } from './api/api.service';

const DEVICE_STALE_MINUTES = 10;
const deviceAlarms = createCwAlarmScheduler();


export interface AppContext {
	session: IJWT | null;
	devices: IDevice[];
    deviceStatuses: { online: number; offline: number };
    totalDeviceCount?: number;
	rules: IRule[];
	triggeredRules: IRule[];
	triggeredRulesCount: number;
	staleDeviceIds: string[];
    accessToken?: string;
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
    accessToken: undefined
};

export function createAppContext(initial: Partial<AppContext> = {}): AppContext {
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
		...initial
	};
}

export function setAppContext(context: AppContext) {
	setContext(appContextKey, context);
}

export function getAppContext(): AppContext {
	return getContext(appContextKey);
}

export function updateAppContext(updates: Partial<AppContext>) {
	const context = getAppContext();
	Object.assign(context, updates);
}

export function onDeviceDataReceived(device: IDevice) {
	const ctx = getAppContext();

	updateAppContext({
		staleDeviceIds: ctx.staleDeviceIds.filter((id) => id !== device.dev_eui)
	});
}
