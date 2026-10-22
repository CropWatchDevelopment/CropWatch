import { describe, expect, it } from 'vitest';
import { readServerConfig, type StaticServerEnv } from './config';

const STATIC_ENV: StaticServerEnv = {
	PUBLIC_SUPABASE_URL: 'https://project.supabase.test',
	PUBLIC_SUPABASE_ANON_KEY: 'anon',
	PRIVATE_RECAPTCHA_PROJECT_ID: 'project',
	PRIVATE_RECAPTCHA_API_KEY: 'api-key',
	PRIVATE_RECAPTCHA_SITE_KEY: 'site-key'
};

describe('readServerConfig', () => {
	it('uses the defaults when nothing optional is set', () => {
		expect(readServerConfig({}, {}, STATIC_ENV)).toEqual({
			supabase: { url: 'https://project.supabase.test', anonKey: 'anon' },
			recaptcha: {
				projectId: 'project',
				apiKey: 'api-key',
				siteKey: 'site-key',
				apiBaseUrl: 'https://recaptchaenterprise.googleapis.com',
				logLevel: 'info'
			},
			libellus: { baseUrl: '', apiToken: '' },
			orgsEnabled: false
		});
	});

	it('reads the dynamic private env, trimming Libellus values and trailing slashes', () => {
		const config = readServerConfig(
			{
				PRIVATE_RECAPTCHA_API_BASE_URL: 'http://127.0.0.1:4174//',
				PRIVATE_LIBELLUS_BASE_URL: '  https://libellus.test/api  ',
				PRIVATE_LIBELLUS_API_TOKEN: ' token ',
				ORGS_ENABLED: 'true'
			},
			{ PRIVATE_RECAPTCHA_LOG_LEVEL: 'DEBUG' },
			STATIC_ENV
		);

		expect(config.recaptcha.apiBaseUrl).toBe('http://127.0.0.1:4174');
		expect(config.recaptcha.logLevel).toBe('debug');
		expect(config.libellus).toEqual({ baseUrl: 'https://libellus.test/api', apiToken: 'token' });
		expect(config.orgsEnabled).toBe(true);
	});

	it('only enables organizations for exactly "true"', () => {
		expect(readServerConfig({ ORGS_ENABLED: 'TRUE' }, {}, STATIC_ENV).orgsEnabled).toBe(false);
		expect(readServerConfig({ ORGS_ENABLED: '1' }, {}, STATIC_ENV).orgsEnabled).toBe(false);
	});

	it('logs only errors in production unless a known log level is requested', () => {
		expect(readServerConfig({}, { NODE_ENV: 'production' }, STATIC_ENV).recaptcha.logLevel).toBe(
			'error'
		);
		expect(
			readServerConfig(
				{},
				{ NODE_ENV: 'production', PRIVATE_RECAPTCHA_LOG_LEVEL: 'loud' },
				STATIC_ENV
			).recaptcha.logLevel
		).toBe('error');
		expect(
			readServerConfig(
				{},
				{ NODE_ENV: 'production', PRIVATE_RECAPTCHA_LOG_LEVEL: 'silent' },
				STATIC_ENV
			).recaptcha.logLevel
		).toBe('silent');
	});

	it('reads the real env by default', () => {
		expect(readServerConfig()).toHaveProperty('supabase');
	});
});
