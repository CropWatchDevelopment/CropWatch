<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let basePath = `/app/account-settings`;

	const links = [
		{ href: `${basePath}/general`, label: `⚙️ ${$_('General')}`, hidden: false },
		{ href: `${basePath}/payment`, label: `💳 ${$_('Payment')}`, hidden: true },
		{
			href: `${basePath}/display-settings`,
			label: `🌍 ${$_('Units & Display Settings')}`,
			hidden: false
		}
	];

	// --- OneSignal Web Push permission handling ---
	let pushPermission = $state<string | null>(null); // 'default' | 'granted' | 'denied'
	let subscriptionState = $state<string | null>(null); // OneSignal specific states
	let isRequesting = $state(false);
	let oneSignalReady = $state(false);

	function refreshStatus() {
		// Browser permission
		pushPermission = typeof Notification !== 'undefined' ? Notification.permission : null;
	}

	async function requestPushPermission() {
		if (isRequesting) return;
		isRequesting = true;
		refreshStatus();
		// Use OneSignal Deferred queue per 2025 SDK pattern
		try {
			(window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
			(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
				try {
					await OneSignal.Notifications.requestPermission();
				} catch (e) {
					console.error('OneSignal permission request failed', e);
				} finally {
					refreshStatus();
					isRequesting = false;
				}
			});
		} catch (e) {
			console.error(e);
			isRequesting = false;
		}
	}

	onMount(() => {
		refreshStatus();
		if (typeof window === 'undefined') return;
		(window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
		(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
			oneSignalReady = true;
			refreshStatus();
			// Attempt to derive subscription state if API available
			try {
				if (OneSignal?.User?.PushSubscription) {
					const status = await OneSignal.User.PushSubscription.getSubscriptionStatus?.();
					if (status) subscriptionState = JSON.stringify(status);
				}
				OneSignal.Notifications.addPermissionObserver?.(function (ev: any) {
					refreshStatus();
				});
			} catch (e) {
				console.warn('Could not read OneSignal subscription state', e);
			}
		});
	});
</script>

<Header userName={data?.user?.email ?? 'Unknown User'} />

<div class="flex min-h-screen flex-col lg:flex-row">
	<div
		class="min-w-60 border-b border-gray-300 p-4 lg:border-r lg:border-b-0 dark:border-neutral-400"
	>
		<h2 class="text-lg font-semibold">{$_('Device Settings')}</h2>
		<nav class="mt-4 flex flex-row flex-wrap lg:flex-col">
			{#each links.filter((l) => !l.hidden) as { href, label }}
				<div>
					<a {href} aria-current={page.url.pathname?.endsWith(href) ? 'page' : undefined}>
						{label}
					</a>
				</div>
			{/each}
		</nav>
	</div>
	<div class="flex-1 p-4">
		{@render children()}

		<!-- Push Notification Opt-In UI -->
		<section class="mt-8 rounded border border-gray-300 p-4 dark:border-neutral-600">
			<h3 class="mb-2 text-lg font-semibold">{$_('Push Notifications')}</h3>
			<p class="mb-3 text-sm">
				{#if pushPermission === 'granted'}
					{$_('You have already enabled push notifications.')}
				{:else if pushPermission === 'denied'}
					{$_(
						'You have blocked notifications in your browser settings. Please allow them in the browser site settings to enable.'
					)}
				{:else}
					{$_(
						'Enable push notifications to receive real-time alerts. You will see a browser prompt after clicking the button below.'
					)}
				{/if}
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<button
					onclick={requestPushPermission}
					class="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
					disabled={pushPermission === 'granted' || pushPermission === 'denied' || isRequesting}
				>
					{#if isRequesting}{$_('Requesting...')}{:else if pushPermission === 'granted'}{$_(
							'Enabled'
						)}{:else if pushPermission === 'denied'}{$_('Blocked')}{:else}{$_(
							'Enable Push Notifications'
						)}{/if}
				</button>
				<span class="text-xs text-gray-600 dark:text-gray-400">
					{$_('Browser Permission:')}
					{pushPermission || 'n/a'} | {$_('SDK Loaded:')}
					{oneSignalReady ? 'yes' : 'no'}
				</span>
			</div>
			{#if subscriptionState}
				<details class="mt-3 text-xs">
					<summary>{$_('Subscription State (debug)')}</summary>
					<pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{subscriptionState}</pre>
				</details>
			{/if}
			<ul class="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400">
				<li>
					{$_('No prompt? You may have previously denied it; check site settings in your browser.')}
				</li>
				<li>{$_('Ensure the site is served over HTTPS (required for web push).')}</li>
				<li>{$_('iOS Safari requires Add to Home Screen before prompting (iOS 16.4+).')}</li>
				<li>{$_('Incognito/private browsing cannot subscribe to push.')}</li>
			</ul>
		</section>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	nav a {
		@apply block rounded-md px-4 py-2 !no-underline;

		&[aria-current='page'] {
			@apply bg-gray-300;

			:global(.dark) & {
				@apply bg-gray-800;
			}
		}
	}
</style>
