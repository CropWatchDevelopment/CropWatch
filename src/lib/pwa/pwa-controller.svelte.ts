import { inAppPath, isInstalledApp, isIosDevice } from './platform';

/** The message `static/push-sw.js` posts to an open window when an alert is tapped. */
export const NAVIGATE_MESSAGE = 'cw:navigate';

const INSTALL_DISMISSED_KEY = 'cw:pwa:install-dismissed-at';
const IOS_HINT_DISMISSED_KEY = 'cw:pwa:ios-hint-dismissed-at';
/** A dismissed install prompt stays away this long. */
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

/** Chromium's install prompt (not in the DOM typings). */
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaControllerDeps {
	/** The offline service worker's URL; null skips registering it (dev). */
	serviceWorkerUrl: string | null;
	/** Opens an in-app path: a tapped alert whose window was already open. */
	onNavigate: (path: string) => void;
}

/**
 * The installed-app side of the shell: registers the offline service worker,
 * offers to install the app (Chromium's install prompt, or Home Screen
 * instructions on iPhone and iPad, where push alerts only work once installed),
 * says when a new version is deployed, shows a count on the app icon, and
 * follows alert taps forwarded by the push worker.
 */
export class PwaController {
	installed = $state(false);
	isIos = $state(false);
	updateAvailable = $state(false);

	#installPrompt = $state<BeforeInstallPromptEvent | null>(null);
	#installDismissed = $state(false);
	#iosHintDismissed = $state(false);
	#updateDismissed = $state(false);
	#window: Window | null = null;
	#registration: ServiceWorkerRegistration | null = null;

	constructor(private readonly deps: PwaControllerDeps) {}

	/** Chromium offered to install the app and it has not been turned down lately. */
	get canInstall(): boolean {
		return this.#installPrompt !== null && !this.installed && !this.#installDismissed;
	}

	/** An iPhone or iPad browser tab: explain Add to Home Screen. */
	get showIosHint(): boolean {
		return this.isIos && !this.installed && !this.#iosHintDismissed;
	}

	get showUpdate(): boolean {
		return this.updateAvailable && !this.#updateDismissed;
	}

	/** Starts watching `win`; returns the cleanup. Browser only. */
	start(win: Window): () => void {
		this.#window = win;
		this.isIos = isIosDevice(win.navigator);
		this.installed = isInstalledApp(win);
		this.#installDismissed = this.#dismissedLately(INSTALL_DISMISSED_KEY);
		this.#iosHintDismissed = this.#dismissedLately(IOS_HINT_DISMISSED_KEY);

		const standalone = win.matchMedia('(display-mode: standalone)');
		const onDisplayModeChange = () => (this.installed = isInstalledApp(win));
		const onInstallPrompt = (event: Event) => {
			event.preventDefault(); // Chromium's own mini-infobar; the dock asks instead
			this.#installPrompt = event as BeforeInstallPromptEvent;
		};
		const onInstalled = () => {
			this.#installPrompt = null;
			this.installed = true;
		};
		const onWorkerMessage = (event: MessageEvent) => this.#followAlert(event.data);
		const workers = win.navigator.serviceWorker;

		standalone.addEventListener('change', onDisplayModeChange);
		win.addEventListener('beforeinstallprompt', onInstallPrompt);
		win.addEventListener('appinstalled', onInstalled);
		workers?.addEventListener('message', onWorkerMessage);
		// Messages from a worker that does not control this page (the push
		// worker) are held until the page starts the queue.
		workers?.startMessages();
		void this.#register();

		return () => {
			standalone.removeEventListener('change', onDisplayModeChange);
			win.removeEventListener('beforeinstallprompt', onInstallPrompt);
			win.removeEventListener('appinstalled', onInstalled);
			workers?.removeEventListener('message', onWorkerMessage);
		};
	}

	async install(): Promise<void> {
		const prompt = this.#installPrompt;
		if (!prompt) return;
		this.#installPrompt = null; // an install prompt can only be shown once
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		if (outcome === 'dismissed') this.dismissInstall();
	}

	dismissInstall(): void {
		this.#installDismissed = true;
		this.#remember(INSTALL_DISMISSED_KEY);
	}

	dismissIosHint(): void {
		this.#iosHintDismissed = true;
		this.#remember(IOS_HINT_DISMISSED_KEY);
	}

	/** Hides the update notice until the next app load. */
	dismissUpdate(): void {
		this.#updateDismissed = true;
	}

	/**
	 * A new version was deployed (SvelteKit's `updated`). Also fetches the new
	 * service worker, which takes over as soon as it has installed.
	 */
	updateFound(): void {
		this.updateAvailable = true;
		this.checkForUpdate();
	}

	/** Asks the browser to look for a new service worker (e.g. when the app is reopened). */
	checkForUpdate(): void {
		void this.#registration?.update().catch(() => undefined);
	}

	reload(): void {
		this.#window?.location.reload();
	}

	/**
	 * Shows `count` on the installed app's icon, or clears it at 0. Chromium
	 * desktop and iOS 16.4+ Home Screen apps (with notifications allowed) show
	 * it; elsewhere this does nothing.
	 */
	setBadge(count: number): void {
		const navigator = this.#window?.navigator;
		if (!navigator || !('setAppBadge' in navigator)) return;
		const pending = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
		void pending.catch(() => undefined);
	}

	async #register(): Promise<void> {
		const workers = this.#window?.navigator.serviceWorker;
		if (!this.deps.serviceWorkerUrl || !workers) return;
		try {
			this.#registration = await workers.register(this.deps.serviceWorkerUrl);
		} catch (error) {
			console.warn('Service worker registration failed:', error);
		}
	}

	#followAlert(data: unknown): void {
		const message = data as { type?: unknown; url?: unknown } | null;
		if (message?.type !== NAVIGATE_MESSAGE || typeof message.url !== 'string') return;
		const path = inAppPath(message.url, this.#window!.location.origin);
		if (path) this.deps.onNavigate(path);
	}

	#dismissedLately(key: string): boolean {
		try {
			const dismissedAt = Number(this.#window!.localStorage.getItem(key));
			return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
		} catch {
			return false; // storage refused (private mode): ask again next time
		}
	}

	#remember(key: string): void {
		try {
			this.#window?.localStorage.setItem(key, String(Date.now()));
		} catch {
			// Dismissed for this visit only.
		}
	}
}
