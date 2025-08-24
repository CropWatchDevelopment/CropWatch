import { env as publicEnv } from '$env/dynamic/public';

// Public-only config for client web push setup.
export const ONE_SIGNAL_PUBLIC_CONFIG = {
	appId: publicEnv.PUBLIC_ONESIGNAL_APP_ID,
	safari_web_id: publicEnv.PUBLIC_ONESIGNAL_SAFARI_WEB_ID
};
