import type { AppState } from '$lib/Interfaces/appState.interface';
import { createContext } from 'svelte';

export type AppStateState = ReturnType<typeof createAppState>;
export type AppStateGetter = () => AppStateState;
export type SelectionId = string | 'all';
export type FiltersContext = {
	getFacility: () => SelectionId;
	getLocation: () => SelectionId;
};

const [useAppStateContext, provideAppStateContext] = createContext<AppStateGetter>();
const [useFiltersContext, provideFiltersContext] = createContext<FiltersContext>();

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
	// Expose a getter so children stay reactive without mutating our binding.
	provideAppStateContext(() => state);
}

export function useAppState(): AppStateGetter {
	return useAppStateContext();
}

export function provideFilters(filters: FiltersContext) {
	provideFiltersContext(filters);
}

export function useFilters(): FiltersContext {
	return useFiltersContext();
}
