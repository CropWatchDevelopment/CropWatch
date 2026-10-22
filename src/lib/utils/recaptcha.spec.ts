import { describe, expect, it, vi } from 'vitest';
import {
	getRecaptchaStatus,
	resetRecaptchaFailureState,
	runRecaptchaAction,
	warmupRecaptcha
} from './recaptcha';

// The browser behaviour is covered in recaptcha.svelte.spec.ts; this file
// covers the module on the server, where the auth pages import it during SSR.
// The env records which keys are read, and when.
const runtime = vi.hoisted(() => {
	const reads: string[] = [];
	const env = new Proxy({ PUBLIC_RECAPTCHA_SITE_KEY: 'test-site-key' } as Record<string, string>, {
		get(target, key: string) {
			reads.push(key);
			return target[key];
		}
	});
	return { env, reads };
});
vi.mock('$env/dynamic/public', () => ({ env: runtime.env }));

describe('reCAPTCHA during SSR', () => {
	it('reads nothing from the env at import time', () => {
		expect(runtime.reads).toEqual([]);
		expect(getRecaptchaStatus()).toBe('idle');
	});

	it('fails a warm-up cleanly without a DOM, after reading the site key', async () => {
		expect(typeof window).toBe('undefined');
		expect(typeof document).toBe('undefined');

		await expect(warmupRecaptcha()).resolves.toBe(false);

		expect(runtime.reads).toContain('PUBLIC_RECAPTCHA_SITE_KEY');
		expect(getRecaptchaStatus()).toBe('error');
		await expect(runRecaptchaAction('LOGIN')).rejects.toBeInstanceOf(Error);
	});

	it('can be reset without a window', () => {
		expect(() => resetRecaptchaFailureState()).not.toThrow();
		expect(getRecaptchaStatus()).toBe('idle');
	});
});
