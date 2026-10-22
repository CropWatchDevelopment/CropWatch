<script lang="ts">
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { updated } from '$app/state';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { PwaController } from '$lib/pwa/pwa-controller.svelte';
	import { onAppForeground } from '$lib/utils/onAppForeground';

	interface Props {
		/** Offer to install the app. Off on the sign-in pages, where the update notice still shows. */
		prompts?: boolean;
		/** The count for the installed app's icon (triggered rules); 0 clears it. */
		badgeCount?: number;
	}

	let { prompts = true, badgeCount = 0 }: Props = $props();

	const pwa = new PwaController({
		// Production builds only: in dev the worker would cache Vite's modules.
		serviceWorkerUrl: dev ? null : `${resolve('/')}service-worker.js`,
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- an in-app path from the push worker
		onNavigate: (path) => void goto(path)
	});

	$effect(() => pwa.start(window));

	// Reopening the app is when a phone most likely missed a deploy.
	$effect(() =>
		onAppForeground(() => {
			void updated.check().catch(() => undefined);
			pwa.checkForUpdate();
		})
	);

	$effect(() => {
		if (updated.current) pwa.updateFound();
	});

	$effect(() => pwa.setBadge(badgeCount));
</script>

<aside class="pwa-dock" aria-live="polite">
	{#if pwa.showUpdate}
		<div class="pwa-dock__card">
			<p class="pwa-dock__eyebrow">{m.pwa_update_ready()}</p>
			<h2 class="pwa-dock__title">{m.pwa_update_title()}</h2>
			<p class="pwa-dock__body">{m.pwa_update_body()}</p>
			<div class="pwa-dock__actions">
				<CwButton variant="ghost" size="sm" onclick={() => pwa.dismissUpdate()}>
					{m.action_later()}
				</CwButton>
				<CwButton variant="primary" size="sm" onclick={() => pwa.reload()}>
					{m.pwa_update_now()}
				</CwButton>
			</div>
		</div>
	{:else if prompts && pwa.canInstall}
		<div class="pwa-dock__card">
			<p class="pwa-dock__eyebrow">{m.pwa_install_app()}</p>
			<h2 class="pwa-dock__title">{m.pwa_install_title()}</h2>
			<p class="pwa-dock__body">{m.pwa_install_body()}</p>
			<div class="pwa-dock__actions">
				<CwButton variant="ghost" size="sm" onclick={() => pwa.dismissInstall()}>
					{m.action_not_now()}
				</CwButton>
				<CwButton variant="primary" size="sm" onclick={() => pwa.install()}>
					{m.action_install()}
				</CwButton>
			</div>
		</div>
	{:else if prompts && pwa.showIosHint}
		<div class="pwa-dock__card">
			<p class="pwa-dock__eyebrow">{m.pwa_install_iphone()}</p>
			<h2 class="pwa-dock__title">{m.pwa_install_iphone_title()}</h2>
			<p class="pwa-dock__body">{m.pwa_install_iphone_body()}</p>
			<div class="pwa-dock__actions">
				<CwButton variant="ghost" size="sm" onclick={() => pwa.dismissIosHint()}>
					{m.action_dismiss()}
				</CwButton>
			</div>
		</div>
	{/if}
</aside>

<style>
	.pwa-dock {
		position: fixed;
		right: calc(var(--app-safe-right, 0px) + var(--cw-space-4));
		bottom: calc(var(--app-safe-bottom, 0px) + var(--cw-space-4));
		z-index: var(--cw-z-overlay);
		width: min(24rem, calc(100vw - 2 * var(--cw-space-4)));
		pointer-events: none;
	}

	.pwa-dock__card {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		padding: var(--cw-space-4);
		border: 1px solid var(--cw-border-default);
		border-radius: var(--cw-card-radius);
		color: var(--cw-text-primary);
		background: var(--cw-bg-surface-elevated);
		box-shadow: var(--cw-shadow-xl);
		pointer-events: auto;
	}

	.pwa-dock__eyebrow {
		margin: 0;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--cw-text-secondary);
	}

	.pwa-dock__title {
		margin: 0;
		font-size: var(--cw-text-base);
		font-weight: var(--cw-font-semibold);
	}

	.pwa-dock__body {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.pwa-dock__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
		margin-top: var(--cw-space-2);
	}
</style>
