import type { RecaptchaLogLevel, RecaptchaServerConfig } from './config';

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

/** Server-side reCAPTCHA Enterprise verification (`locals.services.recaptcha`). */
export interface RecaptchaVerifier {
	/**
	 * Verify a reCAPTCHA Enterprise token using the REST API.
	 * @param token - The reCAPTCHA token from the client
	 * @param expectedAction - The expected action name (e.g., 'LOGIN', 'REGISTER')
	 * @param minScore - Minimum score threshold (0.0 to 1.0, default 0.5)
	 */
	verify(
		token: string,
		expectedAction: string,
		minScore?: number,
		context?: RecaptchaLogContext
	): Promise<RecaptchaVerificationResult>;
}

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

function mask(value: string | null | undefined, keepStart = 6, keepEnd = 4): string {
	if (!value) return '<empty>';
	const v = String(value);
	if (v.length <= keepStart + keepEnd + 3) return '<redacted>';
	return `${v.slice(0, keepStart)}…${v.slice(-keepEnd)}`;
}

function createLogger(current: RecaptchaLogLevel) {
	const order: Record<RecaptchaLogLevel, number> = { silent: 0, error: 1, info: 2, debug: 3 };

	return function log(
		level: Exclude<RecaptchaLogLevel, 'silent'>,
		message: string,
		meta: Record<string, unknown> = {}
	) {
		if (order[current] < order[level]) return;

		const payload = { source: 'recaptcha', ...meta };
		if (level === 'error') console.error(message, payload);
		else if (level === 'info') console.info(message, payload);
		else console.debug(message, payload);
	};
}

/**
 * @param fetchFn - The global `fetch` by default: the assessment API is a
 * third-party call, not a request on behalf of the page.
 */
export function createRecaptchaVerifier(
	config: RecaptchaServerConfig,
	fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init)
): RecaptchaVerifier {
	const { projectId, apiKey, siteKey, apiBaseUrl } = config;
	const log = createLogger(config.logLevel);

	return {
		async verify(token, expectedAction, minScore = 0.5, context = {}) {
			try {
				if (!projectId || !apiKey || !siteKey) {
					log('error', 'reCAPTCHA server env is missing', {
						route: context.route,
						flow: context.flow,
						requestId: context.requestId,
						projectId: mask(projectId),
						apiKey: mask(apiKey),
						siteKey: mask(siteKey)
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

				const url = `${apiBaseUrl}/v1/projects/${projectId}/assessments?key=${apiKey}`;

				const response = await fetchFn(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						event: {
							token: token,
							siteKey: siteKey,
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
						projectId: mask(projectId),
						apiKey: mask(apiKey),
						siteKey: mask(siteKey),
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
	};
}
