import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeFetch, jsonResponse, textResponse } from '$lib/testing/http';
import type { RecaptchaServerConfig } from './config';
import { createRecaptchaVerifier } from './recaptcha';

const CONFIG: RecaptchaServerConfig = {
	projectId: 'cropwatch-project',
	apiKey: 'api-key-1234567890',
	siteKey: 'site-key-1234567890',
	apiBaseUrl: 'https://recaptcha.test',
	logLevel: 'debug'
};

const assessment = (overrides: Record<string, unknown> = {}) => ({
	tokenProperties: { valid: true, action: 'LOGIN' },
	riskAnalysis: { score: 0.9, reasons: [] },
	...overrides
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function silenceConsole() {
	return {
		error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		info: vi.spyOn(console, 'info').mockImplementation(() => {}),
		debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
	};
}

describe('createRecaptchaVerifier', () => {
	it('posts the token to the assessment API and passes a good score', async () => {
		silenceConsole();
		const fake = createFakeFetch(() => jsonResponse(assessment()));

		await expect(
			createRecaptchaVerifier(CONFIG, fake.fetch).verify('token-abcdefghijklmnop', 'LOGIN')
		).resolves.toEqual({ success: true, score: 0.9, action: 'LOGIN', reasons: [] });

		const request = fake.onlyRequest();
		expect(request.url).toBe(
			'https://recaptcha.test/v1/projects/cropwatch-project/assessments?key=api-key-1234567890'
		);
		expect(request.method).toBe('POST');
		expect(request.body).toEqual({
			event: {
				token: 'token-abcdefghijklmnop',
				siteKey: 'site-key-1234567890',
				expectedAction: 'LOGIN'
			}
		});
	});

	it('refuses without calling the API when the server config is incomplete', async () => {
		const { error } = silenceConsole();
		const fake = createFakeFetch();

		await expect(
			createRecaptchaVerifier({ ...CONFIG, apiKey: '' }, fake.fetch).verify('t', 'LOGIN')
		).resolves.toEqual({ success: false, error: 'Server reCAPTCHA configuration missing' });
		expect(fake.requests).toHaveLength(0);
		// Secrets are masked in the log.
		expect(error).toHaveBeenCalledWith(
			'reCAPTCHA server env is missing',
			expect.objectContaining({
				apiKey: '<empty>',
				siteKey: 'site-k…7890',
				projectId: 'cropwa…ject'
			})
		);
	});

	it('fails on an API error status', async () => {
		silenceConsole();
		const fake = createFakeFetch(() => textResponse('quota', { status: 429 }));

		await expect(createRecaptchaVerifier(CONFIG, fake.fetch).verify('t', 'LOGIN')).resolves.toEqual(
			{
				success: false,
				error: 'API error: 429'
			}
		);
	});

	it('fails an invalid token and logs an error payload', async () => {
		const { error } = silenceConsole();
		const fake = createFakeFetch(() =>
			jsonResponse(
				assessment({
					tokenProperties: { valid: false, invalidReason: 'EXPIRED' },
					error: { message: 'token expired' }
				})
			)
		);

		await expect(createRecaptchaVerifier(CONFIG, fake.fetch).verify('', 'LOGIN')).resolves.toEqual({
			success: false,
			error: 'Invalid token: EXPIRED'
		});
		expect(error).toHaveBeenCalledWith(
			'reCAPTCHA API responded with error payload',
			expect.objectContaining({ errorMessage: 'token expired' })
		);
	});

	it('fails a token issued for another action', async () => {
		silenceConsole();
		const fake = createFakeFetch(() =>
			jsonResponse(assessment({ tokenProperties: { valid: true, action: 'REGISTER' } }))
		);

		await expect(createRecaptchaVerifier(CONFIG, fake.fetch).verify('t', 'LOGIN')).resolves.toEqual(
			{
				success: false,
				action: 'REGISTER',
				error: 'Action mismatch'
			}
		);
	});

	it('fails a score below the threshold (0 when the API sends none)', async () => {
		silenceConsole();
		const low = createFakeFetch(() =>
			jsonResponse(assessment({ riskAnalysis: { score: 0.3, reasons: ['AUTOMATION'] } }))
		);
		const none = createFakeFetch(() => jsonResponse(assessment({ riskAnalysis: undefined })));

		await expect(
			createRecaptchaVerifier(CONFIG, low.fetch).verify('t', 'LOGIN', 0.5)
		).resolves.toEqual({
			success: false,
			score: 0.3,
			action: 'LOGIN',
			reasons: ['AUTOMATION'],
			error: 'Score too low: 0.3'
		});
		await expect(
			createRecaptchaVerifier(CONFIG, none.fetch).verify('t', 'LOGIN')
		).resolves.toMatchObject({
			success: false,
			score: 0
		});
	});

	it('turns a thrown error into a failed result', async () => {
		silenceConsole();
		const throwing = (() => Promise.reject(new Error('offline'))) as typeof fetch;
		const throwingValue = (() => Promise.reject('offline')) as typeof fetch;

		await expect(createRecaptchaVerifier(CONFIG, throwing).verify('t', 'LOGIN')).resolves.toEqual({
			success: false,
			error: 'offline'
		});
		await expect(
			createRecaptchaVerifier(CONFIG, throwingValue).verify('t', 'LOGIN')
		).resolves.toEqual({ success: false, error: 'reCAPTCHA verification error' });
	});

	it('logs nothing at the silent level and only errors at the error level', async () => {
		const consoleSpies = silenceConsole();
		const fake = createFakeFetch(() =>
			jsonResponse(assessment({ tokenProperties: { valid: false } }))
		);

		await createRecaptchaVerifier({ ...CONFIG, logLevel: 'silent' }, fake.fetch).verify(
			't',
			'LOGIN'
		);
		await createRecaptchaVerifier({ ...CONFIG, logLevel: 'error' }, fake.fetch).verify(
			't',
			'LOGIN'
		);

		expect(consoleSpies.info).not.toHaveBeenCalled();
		expect(consoleSpies.debug).not.toHaveBeenCalled();
		expect(consoleSpies.error).not.toHaveBeenCalled();
	});

	it('uses the global fetch by default', async () => {
		silenceConsole();
		const fake = createFakeFetch(() => jsonResponse(assessment()));
		vi.stubGlobal('fetch', fake.fetch);

		await createRecaptchaVerifier(CONFIG).verify('t', 'LOGIN');

		expect(fake.requests).toHaveLength(1);
	});
});
