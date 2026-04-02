import {
	getRecaptchaStatus,
	resetRecaptchaFailureState,
	runRecaptchaAction,
	type RecaptchaAction,
	type RecaptchaStatus,
	warmupRecaptcha
} from '$lib/utils/recaptcha';

type AuthRecaptchaState = {
	status: RecaptchaStatus;
	lastError: string | null;
};

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'reCAPTCHA failed';
}

export function createAuthRecaptcha() {
	const state = $state<AuthRecaptchaState>({
		status: getRecaptchaStatus(),
		lastError: null
	});

	function syncStatus() {
		state.status = getRecaptchaStatus();
	}

	async function warmup(): Promise<boolean> {
		syncStatus();
		const warmed = await warmupRecaptcha();
		syncStatus();
		return warmed;
	}

	async function runAction(action: RecaptchaAction): Promise<string> {
		state.lastError = null;
		syncStatus();

		try {
			const token = await runRecaptchaAction(action);
			syncStatus();
			return token;
		} catch (error) {
			state.lastError = toErrorMessage(error);
			resetFailureState();
			throw error;
		}
	}

	function resetFailureState() {
		resetRecaptchaFailureState();
		state.lastError = null;
		syncStatus();
	}

	return {
		state,
		warmup,
		runAction,
		resetFailureState
	};
}
