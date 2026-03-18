import {
	PRIVATE_RECAPTCHA_PROJECT_ID,
	PRIVATE_RECAPTCHA_SITE_KEY,
	PRIVATE_RECAPTCHA_API_KEY
} from '$env/static/private';

export interface RecaptchaVerificationResult {
	success: boolean;
	score?: number;
	action?: string;
	error?: string;
	reasons?: string[];
}

export type RecaptchaLogContext = {
	route?: string;
	flow?: string;
	requestId?: string;
	userAgent?: string;
};

interface AssessmentResponse {
	tokenProperties?: {
		valid?: boolean;
		invalidReason?: string;
		action?: string;
	};
	riskAnalysis?: {
		score?: number;
		reasons?: string[];
	};
	error?: {
		message?: string;
	};
}

type LogLevel = 'silent' | 'error' | 'info' | 'debug';

function getLogLevel(): LogLevel {
	const raw = (process.env.PRIVATE_RECAPTCHA_LOG_LEVEL ?? '').toLowerCase();
	if (raw === 'silent' || raw === 'error' || raw === 'info' || raw === 'debug') return raw;
	return process.env.NODE_ENV === 'production' ? 'error' : 'info';
}

function mask(value: string | null | undefined, keepStart = 6, keepEnd = 4): string {
	if (!value) return '<empty>';
	const v = String(value);
	if (v.length <= keepStart + keepEnd + 3) return '<redacted>';
	return `${v.slice(0, keepStart)}…${v.slice(-keepEnd)}`;
}

function log(
	level: Exclude<LogLevel, 'silent'>,
	message: string,
	meta: Record<string, unknown> = {}
) {
	const current = getLogLevel();
	const order: Record<LogLevel, number> = { silent: 0, error: 1, info: 2, debug: 3 };
	if (order[current] < order[level]) return;

	const payload = { source: 'recaptcha', ...meta };
	if (level === 'error') console.error(message, payload);
	else if (level === 'info') console.info(message, payload);
	else console.debug(message, payload);
}

/**
 * Verify reCAPTCHA Enterprise token using the REST API
 * @param token - The reCAPTCHA token from the client
 * @param expectedAction - The expected action name (e.g., 'LOGIN', 'REGISTER')
 * @param minScore - Minimum score threshold (0.0 to 1.0, default 0.5)
 * @returns Promise resolving to verification result
 */
export async function verifyRecaptchaToken(
	token: string,
	expectedAction: string,
	minScore: number = 0.5,
	context: RecaptchaLogContext = {}
): Promise<RecaptchaVerificationResult> {
	try {
		if (!PRIVATE_RECAPTCHA_PROJECT_ID || !PRIVATE_RECAPTCHA_API_KEY || !PRIVATE_RECAPTCHA_SITE_KEY) {
			log('error', 'reCAPTCHA server env is missing', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				projectId: mask(PRIVATE_RECAPTCHA_PROJECT_ID),
				apiKey: mask(PRIVATE_RECAPTCHA_API_KEY),
				siteKey: mask(PRIVATE_RECAPTCHA_SITE_KEY)
			});
			return {
				success: false,
				error: 'Server reCAPTCHA configuration missing'
			};
		}

		log('debug', 'Starting reCAPTCHA assessment', {
			route: context.route,
			flow: context.flow,
			requestId: context.requestId,
			expectedAction,
			minScore,
			tokenLength: token?.length ?? 0,
			tokenPrefix: token ? mask(token, 12, 0) : '<empty>',
			userAgent: context.userAgent
		});

		const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${PRIVATE_RECAPTCHA_PROJECT_ID}/assessments?key=${PRIVATE_RECAPTCHA_API_KEY}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				event: {
					token: token,
					siteKey: PRIVATE_RECAPTCHA_SITE_KEY,
					expectedAction: expectedAction
				}
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			log('error', 'reCAPTCHA API request failed', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				expectedAction,
				projectId: mask(PRIVATE_RECAPTCHA_PROJECT_ID),
				apiKey: mask(PRIVATE_RECAPTCHA_API_KEY),
				siteKey: mask(PRIVATE_RECAPTCHA_SITE_KEY),
				status: response.status,
				statusText: response.statusText,
				errorText: errorText?.slice(0, 2000) // keep logs bounded
			});
			return {
				success: false,
				error: `API error: ${response.status}`
			};
		}

		const data: AssessmentResponse = await response.json();

		if (data.error?.message) {
			log('error', 'reCAPTCHA API responded with error payload', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				expectedAction,
				errorMessage: data.error.message
			});
		}

		// Check if the token is valid
		if (!data.tokenProperties?.valid) {
			log('info', 'reCAPTCHA token invalid', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				expectedAction,
				invalidReason: data.tokenProperties?.invalidReason
			});
			return {
				success: false,
				error: `Invalid token: ${data.tokenProperties?.invalidReason}`
			};
		}

		// Check if the expected action was executed
		if (data.tokenProperties.action !== expectedAction) {
			log('info', 'reCAPTCHA action mismatch', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				expectedAction,
				gotAction: data.tokenProperties.action
			});
			return {
				success: false,
				action: data.tokenProperties.action ?? undefined,
				error: 'Action mismatch'
			};
		}

		const score = data.riskAnalysis?.score ?? 0;
		const reasons = data.riskAnalysis?.reasons ?? [];

		// Check if the score meets the threshold
		if (score < minScore) {
			log('info', 'reCAPTCHA score below threshold', {
				route: context.route,
				flow: context.flow,
				requestId: context.requestId,
				expectedAction,
				score,
				minScore,
				reasons
			});
			return {
				success: false,
				score,
				action: data.tokenProperties.action ?? undefined,
				reasons,
				error: `Score too low: ${score}`
			};
		}

		log('debug', 'reCAPTCHA assessment passed', {
			route: context.route,
			flow: context.flow,
			requestId: context.requestId,
			expectedAction,
			score,
			reasons
		});

		return {
			success: true,
			score,
			action: data.tokenProperties.action ?? undefined,
			reasons
		};
	} catch (error) {
		log('error', 'reCAPTCHA Enterprise verification threw', {
			route: context.route,
			flow: context.flow,
			requestId: context.requestId,
			expectedAction,
			error: error instanceof Error ? error.message : String(error)
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'reCAPTCHA verification error'
		};
	}
}