import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { NAVIGATE_MESSAGE } from '$lib/pwa/pwa-controller.svelte';

// static/push-sw.js is served as-is (no build step), so it is evaluated here
// against a fake ServiceWorkerGlobalScope rather than imported.
const SOURCE = readFileSync(new URL('../../../static/push-sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://app.cropwatch.test';

type Listener = (event: unknown) => void;

interface FakeWindow {
	url: string;
	focused: boolean;
	focus: ReturnType<typeof vi.fn>;
	postMessage: ReturnType<typeof vi.fn>;
}

function windowClient(url: string, { focused = false, refuseFocus = false } = {}): FakeWindow {
	const client: FakeWindow = {
		url,
		focused,
		focus: vi.fn(async () => {
			if (refuseFocus) throw new DOMException('Not allowed', 'InvalidAccessError');
			return client;
		}),
		postMessage: vi.fn()
	};
	return client;
}

function loadPushWorker(windows: FakeWindow[] = []) {
	const listeners = new Map<string, Listener>();
	const scope = {
		location: new URL('/push-sw.js', ORIGIN),
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		registration: { showNotification: vi.fn(async () => undefined) },
		clients: {
			matchAll: vi.fn(async () => windows),
			openWindow: vi.fn(async () => null)
		}
	};
	new Function('self', SOURCE)(scope);

	const dispatch = async (type: string, event: object) => {
		let pending: Promise<unknown> = Promise.resolve();
		listeners.get(type)!({
			...event,
			waitUntil: (promise: Promise<unknown>) => (pending = promise)
		});
		await pending;
	};

	return {
		scope,
		push: (data: { json?: () => unknown; text?: () => string } | null) =>
			dispatch('push', { data }),
		click: (url?: string) =>
			dispatch('notificationclick', {
				notification: { close: vi.fn(), data: url === undefined ? {} : { url } }
			})
	};
}

const json = (value: unknown) => ({ json: () => value, text: () => JSON.stringify(value) });

describe('push-sw: showing an alert', () => {
	it('shows a data-only alert, tagged by rule and device so a repeat replaces it', async () => {
		const sw = loadPushWorker();
		const url = `${ORIGIN}/locations/4/devices/AB`;

		await sw.push(json({ data: { title: '【CropWatch】Too warm', body: '31 °C', url } }));

		expect(sw.scope.registration.showNotification).toHaveBeenCalledWith('【CropWatch】Too warm', {
			body: '31 °C',
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-192x192.png',
			tag: `【CropWatch】Too warm|${url}`,
			renotify: true,
			data: { url }
		});
	});

	it('uses a tag the sender chose', async () => {
		const sw = loadPushWorker();

		await sw.push(json({ notification: { title: 'Rule', url: '/', tag: 'rule-7' } }));

		expect(sw.scope.registration.showNotification).toHaveBeenCalledWith(
			'Rule',
			expect.objectContaining({ tag: 'rule-7' })
		);
	});

	it('falls back to a plain-text body and the app name when the payload is not JSON', async () => {
		const sw = loadPushWorker();

		await sw.push({
			json: () => {
				throw new SyntaxError('not JSON');
			},
			text: () => 'Gateway offline'
		});

		expect(sw.scope.registration.showNotification).toHaveBeenCalledWith(
			'CropWatch',
			expect.objectContaining({ body: 'Gateway offline', tag: 'CropWatch|/', data: { url: '/' } })
		);
	});

	it('shows something even for an empty push', async () => {
		const sw = loadPushWorker();

		await sw.push(null);

		expect(sw.scope.registration.showNotification).toHaveBeenCalledWith(
			'CropWatch',
			expect.objectContaining({ body: '' })
		);
	});
});

describe('push-sw: tapping an alert', () => {
	const target = `${ORIGIN}/locations/4/devices/AB`;

	it('focuses a window already on the alert’s page', async () => {
		const there = windowClient(target);
		const sw = loadPushWorker([windowClient(`${ORIGIN}/`, { focused: true }), there]);

		await sw.click(target);

		expect(there.focus).toHaveBeenCalledTimes(1);
		expect(there.postMessage).not.toHaveBeenCalled();
		expect(sw.scope.clients.openWindow).not.toHaveBeenCalled();
	});

	it('opens the page in the open app window (the focused one first) instead of a new window', async () => {
		const other = windowClient(`${ORIGIN}/rules`);
		const focused = windowClient(`${ORIGIN}/`, { focused: true });
		const sw = loadPushWorker([other, focused]);

		await sw.click('/locations/4/devices/AB');

		expect(focused.focus).toHaveBeenCalledTimes(1);
		expect(focused.postMessage).toHaveBeenCalledWith({ type: NAVIGATE_MESSAGE, url: target });
		expect(other.focus).not.toHaveBeenCalled();
		expect(sw.scope.clients.openWindow).not.toHaveBeenCalled();
	});

	it('uses any open window when none has focus', async () => {
		const open = windowClient(`${ORIGIN}/rules`);
		const sw = loadPushWorker([open]);

		await sw.click(target);

		expect(open.postMessage).toHaveBeenCalledWith({ type: NAVIGATE_MESSAGE, url: target });
	});

	it('opens a new window when focusing the open one is refused', async () => {
		const sw = loadPushWorker([windowClient(`${ORIGIN}/rules`, { refuseFocus: true })]);

		await sw.click(target);

		expect(sw.scope.clients.openWindow).toHaveBeenCalledWith(target);
	});

	it('opens a new window on the home page when nothing is open and the alert has no URL', async () => {
		const sw = loadPushWorker();

		await sw.click();

		expect(sw.scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
	});
});
