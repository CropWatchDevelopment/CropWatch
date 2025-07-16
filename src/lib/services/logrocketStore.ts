import { writable } from 'svelte/store';
import { logEvent } from './logrocket';

interface LogRocketState {
	initialized: boolean;
	userId: string | null;
}

function createLogRocketStore() {
	const { subscribe, set, update } = writable<LogRocketState>({
		initialized: false,
		userId: null
	});

	return {
		subscribe,
		setInitialized: (initialized: boolean) => update((state) => ({ ...state, initialized })),
		setUserId: (userId: string | null) => update((state) => ({ ...state, userId })),

		// Convenience methods for common events
		trackNavigation: (page: string) => {
			logEvent('page_view', { page });
		},

		trackUserAction: (action: string, context?: Record<string, any>) => {
			logEvent('user_action', { action, ...context });
		},

		trackError: (error: string, context?: Record<string, any>) => {
			logEvent('error', { error, ...context });
		},

		trackFormSubmit: (formName: string, success: boolean) => {
			logEvent('form_submit', { form_name: formName, success });
		}
	};
}

export const logRocketStore = createLogRocketStore();
