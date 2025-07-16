import LogRocket from 'logrocket';
import { browser } from '$app/environment';
import { PUBLIC_LOGROCKET_APP_ID } from '$env/static/public';
import { logRocketStore } from './logrocketStore';

let initialized = false;

export function initLogRocket() {
	if (browser && !initialized && PUBLIC_LOGROCKET_APP_ID) {
		LogRocket.init(PUBLIC_LOGROCKET_APP_ID);
		initialized = true;
		logRocketStore.setInitialized(true);
		console.log('LogRocket initialized');
	}
}

export function identifyUser(userId: string, userInfo: Record<string, any> = {}) {
	if (browser && initialized) {
		LogRocket.identify(userId, userInfo);
		logRocketStore.setUserId(userId);
		console.log('LogRocket user identified:', userId);
	}
}

export function logEvent(eventName: string, properties: Record<string, any> = {}) {
	if (browser && initialized) {
		LogRocket.track(eventName, properties);
	}
}

export function captureException(error: Error, context: Record<string, any> = {}) {
	if (browser && initialized) {
		LogRocket.captureException(error, context);
	}
}

export { LogRocket };
