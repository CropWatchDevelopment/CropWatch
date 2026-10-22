import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	RECAPTCHA_ACTIONS,
	getRecaptchaStatus,
	resetRecaptchaFailureState,
	runRecaptchaAction,
	warmupRecaptcha
} from './recaptcha';

// Boundaries: the SvelteKit env (the site key) and Google's reCAPTCHA
// Enterprise script. Nothing is ever fetched from Google: the `<script>` the
// module injects is captured instead of being connected to the document, and
// the `window.grecaptcha.enterprise` API the script would define is a stub.
const runtime = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/public', () => ({ env: runtime.env }));

type EnterpriseApi = NonNullable<NonNullable<Window['grecaptcha']>['enterprise']>;

const NOT_CONFIGURED = 'reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)';

/** The API Google's script defines; by default `ready` calls back at once. */
function defineEnterpriseApi({
	ready = (callback) => callback(),
	execute = async () => 'recaptcha-token'
}: Partial<EnterpriseApi> = {}) {
	const enterprise = { ready: vi.fn(ready), execute: vi.fn(execute) };
	window.grecaptcha = { enterprise };
	return enterprise;
}

/** Every `<script>` the module tried to add to `<head>`, in order. */
let injected: HTMLScriptElement[] = [];

/** Google's script finishing: its code has defined the API by the time `load` fires. */
function scriptLoads(script = injected.at(-1)) {
	const api = defineEnterpriseApi();
	script?.dispatchEvent(new Event('load'));
	return api;
}

const scriptLoadsWithoutApi = (script = injected.at(-1)) =>
	script?.dispatchEvent(new Event('load'));
const scriptFails = (script = injected.at(-1)) => script?.dispatchEvent(new Event('error'));

/** The badge Google's script renders, inside a wrapper it owns. */
function addBadge() {
	const wrapper = document.createElement('div');
	wrapper.innerHTML = '<div class="grecaptcha-badge"></div>';
	document.body.append(wrapper);
	return wrapper;
}

/** A script tag left by an earlier page; inert here (never fetched or run). */
function addStaleScript(id = '') {
	const script = document.createElement('script');
	script.type = 'text/plain';
	script.id = id;
	script.src = '/stale/recaptcha/enterprise.js';
	document.head.append(script);
	return script;
}

const useFakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

beforeEach(() => {
	runtime.env.PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
	injected = [];
	const append = document.head.appendChild.bind(document.head);
	vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
		if (!(node instanceof HTMLScriptElement)) return append(node);
		injected.push(node);
		return node;
	});
});

afterEach(() => {
	resetRecaptchaFailureState();
	vi.useRealTimers();
	vi.restoreAllMocks();
	for (const key of Object.keys(runtime.env)) delete runtime.env[key];
	document.body.innerHTML = '';
	expect(document.querySelector('script[src^="https://www.google.com/"]')).toBeNull();
});

describe('reCAPTCHA configuration', () => {
	it('lists the actions the auth forms run', () => {
		expect(RECAPTCHA_ACTIONS).toEqual(['LOGIN', 'REGISTER', 'FORGOT_PASSWORD']);
	});

	it.each([
		['unset', undefined],
		['empty', ''],
		['blank', '   ']
	])('refuses to start when the site key is %s', async (_label, key) => {
		runtime.env.PUBLIC_RECAPTCHA_SITE_KEY = key;

		await expect(warmupRecaptcha()).resolves.toBe(false);

		expect(getRecaptchaStatus()).toBe('error');
		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow(NOT_CONFIGURED);
		expect(injected).toEqual([]);
	});

	it('loads Google’s script for the trimmed site key, URL-encoded', async () => {
		runtime.env.PUBLIC_RECAPTCHA_SITE_KEY = '  key/with spaces+&  ';

		const warming = warmupRecaptcha();

		expect(injected).toHaveLength(1);
		const [script] = injected;
		expect(script.id).toBe('cw-recaptcha-enterprise');
		expect(script.src).toBe(
			'https://www.google.com/recaptcha/enterprise.js?render=key%2Fwith%20spaces%2B%26'
		);
		expect(script.async).toBe(true);
		expect(script.defer).toBe(true);

		const api = scriptLoads();
		await expect(warming).resolves.toBe(true);
		await runRecaptchaAction('LOGIN');
		expect(api.execute).toHaveBeenCalledWith('key/with spaces+&', { action: 'LOGIN' });
	});

	it('reads the site key when it is needed, not when the module loads', async () => {
		delete runtime.env.PUBLIC_RECAPTCHA_SITE_KEY;
		await expect(warmupRecaptcha()).resolves.toBe(false);

		runtime.env.PUBLIC_RECAPTCHA_SITE_KEY = 'late-key';
		const api = defineEnterpriseApi();

		await expect(runRecaptchaAction('REGISTER')).resolves.toBe('recaptcha-token');
		expect(api.execute).toHaveBeenCalledWith('late-key', { action: 'REGISTER' });
	});
});

describe('warmupRecaptcha', () => {
	it('loads the script, waits until the API is ready and reports each status', async () => {
		expect(getRecaptchaStatus()).toBe('idle');

		const warming = warmupRecaptcha();
		expect(getRecaptchaStatus()).toBe('loading');

		const api = scriptLoads();
		await expect(warming).resolves.toBe(true);

		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(api.execute).not.toHaveBeenCalled();
		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('does nothing more once reCAPTCHA is ready', async () => {
		const api = defineEnterpriseApi();

		await expect(warmupRecaptcha()).resolves.toBe(true);
		await expect(warmupRecaptcha()).resolves.toBe(true);

		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(injected).toEqual([]);
	});

	it('shares one load between concurrent callers', async () => {
		const first = warmupRecaptcha();
		const second = warmupRecaptcha();
		expect(injected).toHaveLength(1);

		const api = scriptLoads();

		await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
		expect(api.ready).toHaveBeenCalledTimes(1);
	});

	it('uses an API already on the page instead of loading the script again', async () => {
		const script = addStaleScript();
		const api = defineEnterpriseApi();

		await expect(warmupRecaptcha()).resolves.toBe(true);

		expect(injected).toEqual([]);
		expect(script.isConnected).toBe(true);
		expect(api.ready).toHaveBeenCalledTimes(1);
	});

	it('clears out a script whose API never came up before loading a fresh one', async () => {
		const byId = addStaleScript('cw-recaptcha-enterprise');
		const bySource = addStaleScript();
		const badge = addBadge();

		const warming = warmupRecaptcha();

		expect([byId.isConnected, bySource.isConnected, badge.isConnected]).toEqual([
			false,
			false,
			false
		]);
		expect(injected).toHaveLength(1);
		scriptLoads();
		await expect(warming).resolves.toBe(true);
	});

	it('waits for an API that appears shortly after the script has loaded', async () => {
		useFakeTimers();
		const warming = warmupRecaptcha();
		scriptLoadsWithoutApi();

		await vi.advanceTimersByTimeAsync(250);
		expect(getRecaptchaStatus()).toBe('loading');
		const api = defineEnterpriseApi();
		await vi.advanceTimersByTimeAsync(50);

		await expect(warming).resolves.toBe(true);
		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('gives up 4 s after the script loaded without a usable API', async () => {
		useFakeTimers();
		const running = runRecaptchaAction('LOGIN').catch((error: Error) => error.message);
		scriptLoadsWithoutApi();
		const badge = addBadge();

		await vi.advanceTimersByTimeAsync(3_999);
		expect(getRecaptchaStatus()).toBe('loading');
		await vi.advanceTimersByTimeAsync(1);

		await expect(running).resolves.toBe('reCAPTCHA script loaded without a usable Enterprise API');
		expect(getRecaptchaStatus()).toBe('error');
		expect(badge.isConnected).toBe(false);
	});

	it('does not accept an API without `execute`', async () => {
		useFakeTimers();
		const running = runRecaptchaAction('LOGIN').catch((error: Error) => error.message);
		window.grecaptcha = { enterprise: { ready: vi.fn() } as unknown as EnterpriseApi };
		scriptLoadsWithoutApi();

		await vi.advanceTimersByTimeAsync(4_000);

		await expect(running).resolves.toBe('reCAPTCHA script loaded without a usable Enterprise API');
	});

	it('retries a failed script load, backing off 400 ms then 800 ms', async () => {
		useFakeTimers();
		const warming = warmupRecaptcha();

		scriptFails();
		const badge = addBadge();
		await vi.advanceTimersByTimeAsync(399);
		expect(injected).toHaveLength(1);
		expect(badge.isConnected).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(injected).toHaveLength(2);

		scriptFails();
		await vi.advanceTimersByTimeAsync(799);
		expect(injected).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(injected).toHaveLength(3);
		expect(getRecaptchaStatus()).toBe('loading');

		scriptLoads();
		await expect(warming).resolves.toBe(true);
		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('fails after the third failed load, without waiting again', async () => {
		useFakeTimers();
		const running = runRecaptchaAction('LOGIN').catch((error: Error) => error.message);

		scriptFails();
		await vi.advanceTimersByTimeAsync(400);
		scriptFails();
		await vi.advanceTimersByTimeAsync(800);
		scriptFails();

		await expect(running).resolves.toBe('reCAPTCHA script failed to load');
		expect(injected).toHaveLength(3);
		expect(getRecaptchaStatus()).toBe('error');
	});

	it('reports a failed warm-up as false', async () => {
		useFakeTimers();
		const warming = warmupRecaptcha();
		scriptFails();
		await vi.advanceTimersByTimeAsync(400);
		scriptFails();
		await vi.advanceTimersByTimeAsync(800);
		scriptFails();

		await expect(warming).resolves.toBe(false);
		expect(getRecaptchaStatus()).toBe('error');
	});

	it('times out when the API never becomes ready (8 s)', async () => {
		useFakeTimers();
		defineEnterpriseApi({ ready: () => {} });
		const running = runRecaptchaAction('LOGIN').catch((error: Error) => error.message);

		await vi.advanceTimersByTimeAsync(7_999);
		expect(getRecaptchaStatus()).toBe('loading');
		await vi.advanceTimersByTimeAsync(1);

		await expect(running).resolves.toBe('reCAPTCHA Enterprise did not become ready in time');
	});

	it('reports an API that throws while getting ready', async () => {
		const failure = new Error('grecaptcha exploded');
		defineEnterpriseApi({
			ready: () => {
				throw failure;
			}
		});

		await expect(runRecaptchaAction('LOGIN')).rejects.toBe(failure);

		expect(getRecaptchaStatus()).toBe('error');
	});

	it('names a failure that is not an Error generically', async () => {
		defineEnterpriseApi({
			ready: () => {
				throw 'boom';
			}
		});

		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow('reCAPTCHA failed to initialize');
	});

	it('starts over after a failure', async () => {
		defineEnterpriseApi({
			ready: () => {
				throw new Error('not yet');
			}
		});
		await expect(warmupRecaptcha()).resolves.toBe(false);

		const api = defineEnterpriseApi();

		await expect(warmupRecaptcha()).resolves.toBe(true);
		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('lets a load interrupted by a reset finish on the newer load’s readiness', async () => {
		useFakeTimers();
		const interrupted = warmupRecaptcha();
		const [firstScript] = injected;
		resetRecaptchaFailureState();

		let becomeReady = () => {};
		const api = defineEnterpriseApi({ ready: (callback) => (becomeReady = callback) });
		const fresh = warmupRecaptcha();
		await vi.advanceTimersByTimeAsync(0);
		expect(api.ready).toHaveBeenCalledTimes(1);
		// The interrupted load's script arrives while the new load waits for readiness.
		firstScript.dispatchEvent(new Event('load'));
		await vi.advanceTimersByTimeAsync(0);
		becomeReady();

		await expect(Promise.all([interrupted, fresh])).resolves.toEqual([true, true]);
		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(injected).toHaveLength(1);
	});
});

describe('runRecaptchaAction', () => {
	it.each(RECAPTCHA_ACTIONS)('returns a token for %s', async (action) => {
		const api = defineEnterpriseApi({ execute: async () => `token-for-${action}` });

		await expect(runRecaptchaAction(action)).resolves.toBe(`token-for-${action}`);

		expect(api.execute).toHaveBeenCalledWith('test-site-key', { action });
		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('loads reCAPTCHA first when it is not ready yet', async () => {
		const running = runRecaptchaAction('LOGIN');
		expect(injected).toHaveLength(1);

		const api = scriptLoads();

		await expect(running).resolves.toBe('recaptcha-token');
		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(api.execute).toHaveBeenCalledTimes(1);
	});

	it('fails when reCAPTCHA cannot start', async () => {
		defineEnterpriseApi({
			ready: () => {
				throw new Error('blocked by an extension');
			}
		});

		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow('blocked by an extension');
		expect(window.grecaptcha?.enterprise?.execute).not.toHaveBeenCalled();
	});

	it.each([
		['an empty token', ''],
		['no token', undefined]
	])('rejects %s', async (_label, token) => {
		defineEnterpriseApi({ execute: async () => token as string });

		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow('reCAPTCHA returned an empty token');

		expect(getRecaptchaStatus()).toBe('ready');
	});

	it('keeps the loaded script when a token request fails, so the next attempt is instant', async () => {
		const api = defineEnterpriseApi();
		await warmupRecaptcha();
		const failure = new Error('net::ERR_NETWORK_CHANGED');
		api.execute.mockRejectedValueOnce(failure);

		await expect(runRecaptchaAction('LOGIN')).rejects.toBe(failure);
		expect(getRecaptchaStatus()).toBe('ready');
		expect(window.grecaptcha?.enterprise).toBe(api);

		await expect(runRecaptchaAction('LOGIN')).resolves.toBe('recaptcha-token');
		expect(api.ready).toHaveBeenCalledTimes(1);
		expect(injected).toEqual([]);
	});

	it('names a token failure that is not an Error generically', async () => {
		defineEnterpriseApi({ execute: () => Promise.reject('nope') });

		await expect(runRecaptchaAction('REGISTER')).rejects.toThrow(
			'reCAPTCHA token generation failed'
		);
	});

	it('times out a token request after 12 s', async () => {
		useFakeTimers();
		defineEnterpriseApi({ execute: () => new Promise<string>(() => {}) });
		await warmupRecaptcha();

		let outcome: unknown = 'pending';
		void runRecaptchaAction('FORGOT_PASSWORD').catch((error: Error) => (outcome = error.message));
		await vi.advanceTimersByTimeAsync(11_999);
		expect(outcome).toBe('pending');
		await vi.advanceTimersByTimeAsync(1);

		expect(outcome).toBe('reCAPTCHA token generation timed out');
	});

	it('fails when the execute API disappears while getting ready', async () => {
		defineEnterpriseApi({
			ready: (callback) => {
				delete (window.grecaptcha?.enterprise as Partial<EnterpriseApi>).execute;
				callback();
			}
		});

		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow(
			'reCAPTCHA Enterprise execute API is unavailable'
		);
	});

	it('re-checks the site key before requesting a token', async () => {
		const api = defineEnterpriseApi({
			ready: (callback) => {
				delete runtime.env.PUBLIC_RECAPTCHA_SITE_KEY;
				callback();
			}
		});

		await expect(runRecaptchaAction('LOGIN')).rejects.toThrow(NOT_CONFIGURED);

		expect(api.execute).not.toHaveBeenCalled();
		expect(getRecaptchaStatus()).toBe('error');
	});
});

describe('resetRecaptchaFailureState', () => {
	const reset = resetRecaptchaFailureState;

	it('removes the script, the badge and the API, and starts from scratch', async () => {
		defineEnterpriseApi({
			ready: () => {
				throw new Error('broken');
			}
		});
		await warmupRecaptcha();
		const script = addStaleScript('cw-recaptcha-enterprise');
		const badge = addBadge();

		reset();

		expect(getRecaptchaStatus()).toBe('idle');
		expect(window.grecaptcha).toBeUndefined();
		expect(script.isConnected).toBe(false);
		expect(badge.isConnected).toBe(false);

		const warming = warmupRecaptcha();
		expect(injected).toHaveLength(1);
		scriptLoads();
		await expect(warming).resolves.toBe(true);
	});

	it('does not let a load it interrupted abandon the newer load when that old one fails', async () => {
		useFakeTimers();
		const interrupted = warmupRecaptcha();
		const [oldScript] = injected;
		reset();
		const fresh = warmupRecaptcha();
		expect(injected).toHaveLength(2);

		// The interrupted load fails for good (three failed attempts)…
		scriptFails(oldScript);
		await vi.advanceTimersByTimeAsync(400);
		scriptFails();
		await vi.advanceTimersByTimeAsync(800);
		scriptFails();
		await expect(interrupted).resolves.toBe(false);

		// …but the newer load is still the one in flight: a third caller joins it.
		const joining = warmupRecaptcha();
		expect(injected).toHaveLength(4);
		scriptLoads(injected[1]);
		await expect(Promise.all([fresh, joining])).resolves.toEqual([true, true]);
	});
});
