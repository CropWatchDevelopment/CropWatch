import { invalidateAll } from '$app/navigation';
import type { AppState } from '$lib/Interfaces/appState.interface';
import type { Device } from '$lib/Interfaces/device.interface';
import { getContext, setContext } from 'svelte';

const APP_STATE_KEY = 'appState';

export type AppStateState = ReturnType<typeof createAppState>;
export type AppStateGetter = () => AppStateState;

export function createAppState(initial: AppState) {
	let appState = $state({
		facilities: initial.facilities ?? [],
		locations: initial.locations ?? [],
		devices: initial.devices ?? [],
		alerts: initial.alerts ?? [],
		isLoggedIn: initial.isLoggedIn ?? false,
		profile: initial.profile ?? null,
		userEmail: initial.userEmail ?? null
	});

	return appState;
}

export function provideAppState(state: AppStateState) {
	// Expose a getter so children stay reactive without mutating our binding
	setContext(APP_STATE_KEY, () => state);
}

export function useAppState(): AppStateGetter {
	const getter = getContext<AppStateGetter>(APP_STATE_KEY);
	if (!getter) {
		throw new Error('appState context not found');
	}

	return getter;
}
