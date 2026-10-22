import { describe, expect, it } from 'vitest';
import { APP_ENVIRONMENTS, isAppEnvironment, resolveAppEnvironment } from './environment';
import { readPublicConfig } from './public';

describe('resolveAppEnvironment', () => {
	it('uses an explicit PUBLIC_APP_ENV when it names a known environment', () => {
		expect(resolveAppEnvironment('staging', 'production')).toBe('staging');
		expect(resolveAppEnvironment(' Production ', 'development')).toBe('production');
	});

	it('falls back to the Vite mode, and to development for any other mode', () => {
		expect(resolveAppEnvironment(undefined, 'production')).toBe('production');
		expect(resolveAppEnvironment('', 'staging')).toBe('staging');
		expect(resolveAppEnvironment('qa', 'development')).toBe('development');
		expect(resolveAppEnvironment(undefined, 'test')).toBe('development');
	});

	it('recognises exactly the three environments', () => {
		expect(APP_ENVIRONMENTS).toEqual(['development', 'staging', 'production']);
		expect(isAppEnvironment('staging')).toBe(true);
		expect(isAppEnvironment('prod')).toBe(false);
		expect(isAppEnvironment(undefined)).toBe(false);
	});
});

describe('readPublicConfig', () => {
	it('uses the documented defaults when nothing is set', () => {
		expect(readPublicConfig({}, 'production', false)).toEqual({
			environment: 'production',
			apiBaseUrl: '',
			endpoints: {
				login: '/auth/login',
				deviceStatus: '/devices/status',
				ruleTemplates: '/rules',
				reportTemplates: '/reports',
				airNotes: '/air/notes',
				airNotesForMonth: '/air/notes/{dev_eui}/month/{month}/year/{year}'
			},
			gaMeasurementId: '',
			recaptchaSiteKey: null
		});
	});

	it('takes every value from the env, keeping set-but-empty values as they are', () => {
		const config = readPublicConfig(
			{
				PUBLIC_APP_ENV: 'staging',
				PUBLIC_API_BASE_URL: ' https://api.staging.example ',
				PUBLIC_LOGIN_ENDPOINT: '/v2/login',
				PUBLIC_DEVICE_STATUS_ENDPOINT: '',
				PUBLIC_RULE_TEMPLATES_ENDPOINT: '/v2/rules',
				PUBLIC_REPORT_TEMPLATES_ENDPOINT: '/v2/reports',
				PUBLIC_AIR_NOTES_ENDPOINT: '/v2/notes',
				PUBLIC_GET_AIR_NOTES_ENDPOINT: '/v2/notes/{dev_eui}',
				PUBLIC_GA_MEASUREMENT_ID: 'G-123',
				PUBLIC_RECAPTCHA_SITE_KEY: '  site-key  '
			},
			'production'
		);

		expect(config).toMatchObject({
			environment: 'staging',
			apiBaseUrl: ' https://api.staging.example ',
			endpoints: {
				login: '/v2/login',
				deviceStatus: '',
				ruleTemplates: '/v2/rules',
				reportTemplates: '/v2/reports',
				airNotes: '/v2/notes',
				airNotesForMonth: '/v2/notes/{dev_eui}'
			},
			recaptchaSiteKey: 'site-key'
		});
	});

	it('disables analytics on the Vite dev server only', () => {
		const env = { PUBLIC_GA_MEASUREMENT_ID: 'G-123' };

		expect(readPublicConfig(env, 'production', false).gaMeasurementId).toBe('G-123');
		expect(readPublicConfig(env, 'development', true).gaMeasurementId).toBe('');
		expect(readPublicConfig({}, 'production', false).gaMeasurementId).toBe('');
	});

	it('treats a blank reCAPTCHA site key as not configured', () => {
		expect(readPublicConfig({ PUBLIC_RECAPTCHA_SITE_KEY: '   ' }).recaptchaSiteKey).toBeNull();
	});

	it('reads the real env by default', () => {
		expect(readPublicConfig()).toHaveProperty('environment');
	});
});
