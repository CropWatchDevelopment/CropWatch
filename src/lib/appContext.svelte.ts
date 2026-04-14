import { getContext, setContext } from 'svelte';
import type { IJWT } from './interfaces/jwt.interface';
import type { Profile } from './interfaces/profile.interface';

type AppDevice = {
	dev_eui: string;
	name?: string;
	location_id?: number | null;
};

export interface AppContext {
	profile?: Profile;
	session: IJWT | null;
	devices: AppDevice[];
	accessToken?: string;
}

export const appContextKey = Symbol('appContext');

export const defaultAppContext: AppContext = {
	profile: undefined,
	session: null,
	devices: [],
	accessToken: undefined
};

export function createAppContext(initial: Partial<AppContext> = {}): AppContext {
	return {
		...defaultAppContext,
		...initial
	};
}

export function setAppContext(context: AppContext) {
	setContext(appContextKey, context);
}

export function getAppContext(): AppContext {
	return getContext(appContextKey);
}
