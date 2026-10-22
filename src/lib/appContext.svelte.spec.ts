import { mount, unmount, type Component } from 'svelte';
import { describe, expect, it } from 'vitest';
import * as appContextModule from './appContext.svelte';
import {
	appContextKey,
	createAppContext,
	defaultAppContext,
	getAppContext,
	setAppContext,
	type AppContext
} from './appContext.svelte';
import { renderWithServices } from '$lib/testing/render';

/** The keys `createAppContext` fills in (no `preferences` / `orgContext`), in order. */
const CREATED_KEYS = [
	'profile',
	'session',
	'devices',
	'deviceStatuses',
	'totalDeviceCount',
	'rules',
	'triggeredRules',
	'triggeredRulesCount',
	'accessToken',
	'staleDeviceIds',
	'locationGroups',
	'drawerOpen',
	'privacyModeEnabled'
];

const CREATED = {
	profile: undefined,
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
	privacyModeEnabled: false
};

/** Runs `fn` while a root component initialises, with `context` as its context map. */
function duringInit<T>(fn: () => T, context?: Map<unknown, unknown>): T {
	let result!: T;
	const Probe: Component = () => {
		result = fn();
		return {};
	};
	const target = document.body.appendChild(document.createElement('div'));
	const instance = mount(Probe, { target, context });
	unmount(instance);
	target.remove();
	return result;
}

describe('defaultAppContext', () => {
	it('is the signed-out state, including empty preferences and org context', () => {
		expect(Object.keys(defaultAppContext)).toEqual([
			'profile',
			'preferences',
			'orgContext',
			'session',
			'devices',
			'deviceStatuses',
			'totalDeviceCount',
			'rules',
			'triggeredRules',
			'triggeredRulesCount',
			'staleDeviceIds',
			'locationGroups',
			'accessToken',
			'drawerOpen',
			'privacyModeEnabled'
		]);
		expect(defaultAppContext).toEqual({
			...CREATED,
			preferences: undefined,
			orgContext: undefined
		});
	});
});

describe('createAppContext', () => {
	it('creates the initial state outside a component', () => {
		const context = createAppContext();

		expect(Object.keys(context)).toEqual(CREATED_KEYS);
		expect(context).toEqual(CREATED);
		expect('preferences' in context).toBe(false);
		expect('orgContext' in context).toBe(false);
	});

	it('applies the initial values on top, keeping the key order', () => {
		const context = createAppContext({
			accessToken: 'jwt',
			triggeredRulesCount: 3,
			drawerOpen: true
		});

		expect(Object.keys(context)).toEqual(CREATED_KEYS);
		expect(context).toMatchObject({ accessToken: 'jwt', triggeredRulesCount: 3, drawerOpen: true });
	});

	it('appends initial values for keys it does not set itself', () => {
		const context = createAppContext({
			preferences: { user_id: 'u' } as AppContext['preferences']
		});

		expect(Object.keys(context)).toEqual([...CREATED_KEYS, 'preferences']);
		expect(context.preferences).toEqual({ user_id: 'u' });
	});

	it('never shares lists or counters between contexts', () => {
		const first = createAppContext();
		const second = createAppContext();

		expect(first).not.toBe(second);
		expect(first.devices).not.toBe(second.devices);
		expect(first.deviceStatuses).not.toBe(second.deviceStatuses);
		expect(first.locationGroups).not.toBe(second.locationGroups);
		expect(first.devices).not.toBe(defaultAppContext.devices);
	});

	it('creates a fresh state in a component tree without one', () => {
		const context = duringInit(() => createAppContext({ accessToken: 'jwt' }), new Map());

		expect(Object.keys(context)).toEqual(CREATED_KEYS);
		expect(context).toEqual({ ...CREATED, accessToken: 'jwt' });
	});

	it('reuses the context already provided above it (e.g. across hot reloads)', () => {
		const existing = createAppContext({ accessToken: 'existing' });

		const context = duringInit(
			() => createAppContext({ accessToken: 'ignored' }),
			new Map([[appContextKey, existing]])
		);

		expect(context).toBe(existing);
		expect(context.accessToken).toBe('existing');
	});
});

describe('setAppContext / getAppContext', () => {
	it('provide one shared context to the component tree', () => {
		const provided = createAppContext({ accessToken: 'jwt' });
		const map = new Map<unknown, unknown>();

		const read = duringInit(() => {
			setAppContext(provided);
			return getAppContext();
		}, map);

		expect(read).toBe(provided);
		expect(map.get(appContextKey)).toBe(provided);
	});

	it('read the context the root layout (here: the test harness) provides', () => {
		let read: AppContext | undefined;
		const Reader: Component = () => {
			read = getAppContext();
			return {};
		};

		const view = renderWithServices(Reader, { app: { accessToken: 'jwt' } });

		expect(read).toBe(view.app);
		expect(read?.accessToken).toBe('jwt');
		view.unmount();
	});

	it('returns nothing in a tree without an app context', () => {
		expect(duringInit(() => getAppContext(), new Map())).toBeUndefined();
	});
});

describe('the module', () => {
	it('offers only the context API: the app state lives in the context the layout provides', () => {
		expect(Object.keys(appContextModule).sort()).toEqual([
			'appContextKey',
			'createAppContext',
			'defaultAppContext',
			'getAppContext',
			'setAppContext'
		]);
	});
});
