<script lang="ts">
	import { browser, dev } from '$app/environment';
	import { base } from '$app/paths';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';

	type InstallOutcome = 'accepted' | 'dismissed';

	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
	};

	type NavigatorWithStandalone = Navigator & {
		standalone?: boolean;
	};

	const INSTALL_DISMISS_KEY = 'cropwatch.pwa.install-dismissed-at';
	const IOS_HINT_DISMISS_KEY = 'cropwatch.pwa.ios-hint-dismissed-at';
	const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let registration = $state<ServiceWorkerRegistration | null>(null);
	let hideUpdatePrompt = $state(false);
	let installed = $state(false);
	let installDismissed = $state(false);
	let isIos = $state(false);
	let iosHintDismissed = $state(false);
	let isSafari = $state(false);
	let updateReady = $state(false);

	let canShowInstall = $derived(!!deferredPrompt && !installed && !installDismissed);
	let canShowIosHint = $derived(
		isIos && isSafari && !installed && !deferredPrompt && !iosHintDismissed
	);
	let canShowUpdate = $derived(updateReady && !hideUpdatePrompt);
	let showDock = $derived(canShowUpdate || canShowInstall || canShowIosHint);

	let refreshing = false;

	function readDismissed(key: string): boolean {
		if (!browser) return false;

		const rawValue = window.localStorage.getItem(key);
		if (!rawValue) return false;

		const dismissedAt = Number(rawValue);
		if (!Number.isFinite(dismissedAt)) {
			window.localStorage.removeItem(key);
			return false;
		}

		return Date.now() - dismissedAt < DISMISS_TTL_MS;
	}

	function dismissForNow(key: string): void {
		window.localStorage.setItem(key, String(Date.now()));
	}

	function syncInstalledState(): void {
		const navigatorWithStandalone = navigator as NavigatorWithStandalone;
		installed =
			window.matchMedia('(display-mode: standalone)').matches ||
			window.matchMedia('(display-mode: fullscreen)').matches ||
			window.matchMedia('(display-mode: window-controls-overlay)').matches ||
			navigatorWithStandalone.standalone === true;

		if (installed) {
			deferredPrompt = null;
		}
	}

	function syncPlatformState(): void {
		const userAgent = window.navigator.userAgent;
		const touchMac = userAgent.includes('Macintosh') && window.navigator.maxTouchPoints > 1;
		isIos = /iPad|iPhone|iPod/.test(userAgent) || touchMac;
		isSafari = /Safari/.test(userAgent) && !/CriOS|EdgiOS|FxiOS|OPiOS/.test(userAgent);
	}

	function syncUpdateState(serviceWorkerRegistration: ServiceWorkerRegistration): void {
		if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) {
			hideUpdatePrompt = false;
			updateReady = true;
		}
	}

	function watchRegistration(serviceWorkerRegistration: ServiceWorkerRegistration): void {
		syncUpdateState(serviceWorkerRegistration);

		serviceWorkerRegistration.addEventListener('updatefound', () => {
			hideUpdatePrompt = false;

			const worker = serviceWorkerRegistration.installing;
			if (!worker) return;

			worker.addEventListener('statechange', () => {
				if (worker.state === 'installed' && navigator.serviceWorker.controller) {
					updateReady = true;
				}
			});
		});
	}

	async function registerServiceWorker(): Promise<void> {
		if (!('serviceWorker' in navigator)) return;

		try {
			registration = await navigator.serviceWorker.register(`${base}/service-worker.js`, {
				type: dev ? 'module' : 'classic'
			});

			if (!registration) return;

			watchRegistration(registration);
		} catch (error) {
			if (dev) {
				console.warn('PWA service worker registration failed', error);
			}
		}
	}

	async function promptInstall(): Promise<void> {
		if (!deferredPrompt) return;

		const promptEvent = deferredPrompt;
		await promptEvent.prompt();

		const { outcome } = await promptEvent.userChoice;
		deferredPrompt = null;

		if (outcome === 'dismissed') {
			dismissForNow(INSTALL_DISMISS_KEY);
			installDismissed = true;
			return;
		}

		installDismissed = false;
		syncInstalledState();
	}

	function dismissInstallPrompt(): void {
		dismissForNow(INSTALL_DISMISS_KEY);
		installDismissed = true;
	}

	function dismissIosHint(): void {
		dismissForNow(IOS_HINT_DISMISS_KEY);
		iosHintDismissed = true;
	}

	function dismissUpdatePrompt(): void {
		hideUpdatePrompt = true;
	}

	function applyUpdate(): void {
		hideUpdatePrompt = true;
		registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
	}

	onMount(() => {
		syncPlatformState();
		syncInstalledState();
		installDismissed = readDismissed(INSTALL_DISMISS_KEY);
		iosHintDismissed = readDismissed(IOS_HINT_DISMISS_KEY);

		const displayModeMediaQuery = window.matchMedia('(display-mode: standalone)');
		const handleDisplayModeChange = () => syncInstalledState();
		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			deferredPrompt = event as BeforeInstallPromptEvent;
		};
		const handleAppInstalled = () => {
			window.localStorage.removeItem(INSTALL_DISMISS_KEY);
			window.localStorage.removeItem(IOS_HINT_DISMISS_KEY);
			deferredPrompt = null;
			installDismissed = false;
			iosHintDismissed = false;
			syncInstalledState();
		};
		const handleControllerChange = () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				const currentRegistration = registration;
				void currentRegistration?.update();
			}
		};

		if ('addEventListener' in displayModeMediaQuery) {
			displayModeMediaQuery.addEventListener('change', handleDisplayModeChange);
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

		void registerServiceWorker();

		return () => {
			if ('removeEventListener' in displayModeMediaQuery) {
				displayModeMediaQuery.removeEventListener('change', handleDisplayModeChange);
			}

			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
		};
	});
</script>

{#if showDock}
	<aside class="pwa-dock" aria-live="polite">
		{#if canShowUpdate}
			<div class="pwa-card">
				<p class="pwa-eyebrow">{m.pwa_update_ready()}</p>
				<h2>{m.pwa_update_title()}</h2>
				<p>{m.pwa_update_body()}</p>
				<div class="pwa-actions">
					<CwButton variant="info" onclick={applyUpdate}>{m.pwa_update_now()}</CwButton>
					<CwButton variant="secondary" onclick={dismissUpdatePrompt}>{m.action_later()}</CwButton>
				</div>
			</div>
		{:else if canShowInstall}
			<div class="pwa-card">
				<p class="pwa-eyebrow">{m.pwa_install_app()}</p>
				<h2>{m.pwa_install_title()}</h2>
				<p>{m.pwa_install_body()}</p>
				<div class="pwa-actions">
					<CwButton variant="info" onclick={promptInstall}>{m.action_install()}</CwButton>
					<CwButton variant="secondary" onclick={dismissInstallPrompt}>{m.action_not_now()}</CwButton>
				</div>
			</div>
		{:else if canShowIosHint}
			<div class="pwa-card">
				<p class="pwa-eyebrow">{m.pwa_install_iphone()}</p>
				<h2>{m.pwa_install_iphone_title()}</h2>
				<p>{m.pwa_install_iphone_body()}</p>
				<div class="pwa-actions">
					<CwButton variant="secondary" onclick={dismissIosHint}>{m.action_dismiss()}</CwButton>
				</div>
			</div>
		{/if}
	</aside>
{/if}

<style>
	.pwa-dock {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right, 0px) + 1rem);
		bottom: max(1rem, env(safe-area-inset-bottom, 0px) + 1rem);
		z-index: 80;
		width: min(24rem, calc(100vw - 2rem));
	}

	.pwa-card {
		border: 1px solid rgb(148 163 184 / 0.28);
		border-radius: 1.25rem;
		padding: 1rem 1rem 0.9rem;
		color: #e2e8f0;
		background:
			linear-gradient(135deg, rgb(15 23 42 / 0.96), rgb(30 41 59 / 0.94)),
			radial-gradient(circle at top right, rgb(96 165 250 / 0.25), transparent 50%);
		box-shadow:
			0 20px 50px rgb(15 23 42 / 0.4),
			inset 0 1px 0 rgb(255 255 255 / 0.06);
		backdrop-filter: blur(18px);
	}

	.pwa-card h2 {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.3;
	}

	.pwa-card p {
		margin: 0.55rem 0 0;
		font-size: 0.92rem;
		line-height: 1.45;
		color: rgb(226 232 240 / 0.88);
	}

	.pwa-eyebrow {
		margin: 0 0 0.45rem !important;
		font-size: 0.72rem !important;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #86efac !important;
	}

	.pwa-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	@media (max-width: 640px) {
		.pwa-dock {
			right: max(0.75rem, env(safe-area-inset-right, 0px) + 0.75rem);
			left: max(0.75rem, env(safe-area-inset-left, 0px) + 0.75rem);
			width: auto;
		}
	}
</style>
