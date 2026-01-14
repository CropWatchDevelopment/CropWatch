import { PRIVATE_RECAPTCHA_PROJECT_ID, PRIVATE_RECAPTCHA_SITE_KEY, PRIVATE_RECAPTCHA_API_KEY } from '$env/static/private';

export interface RecaptchaVerificationResult {
	success: boolean;
	score?: number;
	action?: string;
	error?: string;
	reasons?: string[];
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
	minScore: number = 0.5
): Promise<RecaptchaVerificationResult> {
	try {
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
			console.error('reCAPTCHA API error:', errorText);
			return {
				success: false,
				error: `API error: ${response.status}`
			};
		}

		const data: AssessmentResponse = await response.json();

		// Check if the token is valid
		if (!data.tokenProperties?.valid) {
			console.error(
				`reCAPTCHA token invalid: ${data.tokenProperties?.invalidReason}`
			);
			return {
				success: false,
				error: `Invalid token: ${data.tokenProperties?.invalidReason}`
			};
		}

		// Check if the expected action was executed
		if (data.tokenProperties.action !== expectedAction) {
			console.error(
				`reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.tokenProperties.action}`
			);
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
			console.warn(`reCAPTCHA score too low: ${score}`, reasons);
			return {
				success: false,
				score,
				action: data.tokenProperties.action ?? undefined,
				reasons,
				error: `Score too low: ${score}`
			};
		}

		return {
			success: true,
			score,
			action: data.tokenProperties.action ?? undefined,
			reasons
		};
	} catch (error) {
		console.error('reCAPTCHA Enterprise verification error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'reCAPTCHA verification error'
		};
	}
}
