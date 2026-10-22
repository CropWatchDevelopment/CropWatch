import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_VAPID_KEY
} from '$env/static/public';

export interface FirebaseConfig {
	apiKey: string;
	authDomain: string;
	projectId: string;
	messagingSenderId: string;
	appId: string;
	vapidKey: string;
}

/**
 * Firebase Cloud Messaging (web push) settings. Unlike `readPublicConfig()`
 * these are build-time values (`$env/static/public`): each environment's build
 * bakes in its own Firebase project.
 */
export function readFirebaseConfig(): FirebaseConfig {
	return {
		apiKey: PUBLIC_FIREBASE_API_KEY,
		authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: PUBLIC_FIREBASE_PROJECT_ID,
		messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: PUBLIC_FIREBASE_APP_ID,
		vapidKey: PUBLIC_FIREBASE_VAPID_KEY
	};
}
