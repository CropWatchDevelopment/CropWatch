<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	let isOffline = $state(false);
	let wasOffline = $state(false);
	let showReconnected = $state(false);

	onMount(() => {
		// Check initial state
		isOffline = !navigator.onLine;

		const handleOnline = () => {
			isOffline = false;
			if (wasOffline) {
				showReconnected = true;
				setTimeout(() => {
					showReconnected = false;
				}, 3000);
			}
		};

		const handleOffline = () => {
			isOffline = true;
			wasOffline = true;
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	function retry() {
		// Attempt to reload the page
		window.location.reload();
	}
</script>

{#if isOffline}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm"
	>
		<div
			transition:scale={{ duration: 300, easing: backOut, start: 0.95 }}
			class="mx-4 flex max-w-lg flex-col items-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl md:p-12"
		>
			<!-- Animated WiFi Off Icon -->
			<div class="relative mb-6">
				<div class="absolute inset-0 animate-ping rounded-full bg-amber-500/20"></div>
				<div class="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-10 w-10 text-amber-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
						/>
						<!-- Diagonal line to indicate "off" -->
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 3l18 18"
							class="text-amber-500"
						/>
					</svg>
				</div>
			</div>

			<!-- Heading -->
			<h1 class="text-2xl font-semibold text-white md:text-3xl">You're Offline</h1>
			
			<!-- Subheading -->
			<p class="mt-3 text-slate-400">
				It looks like you've lost your internet connection. CropWatch needs an active connection to sync your device data.
			</p>

			<!-- Visual separator -->
			<div class="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

			<!-- What to do section -->
			<div class="w-full space-y-3 text-left">
				<p class="text-sm font-medium text-slate-300">While you wait, you can try:</p>
				<ul class="space-y-2 text-sm text-slate-400">
					<li class="flex items-center gap-2">
						<svg class="h-4 w-4 flex-shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Checking if your WiFi is connected</span>
					</li>
					<li class="flex items-center gap-2">
						<svg class="h-4 w-4 flex-shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Moving closer to your router</span>
					</li>
					<li class="flex items-center gap-2">
						<svg class="h-4 w-4 flex-shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Switching to mobile data if available</span>
					</li>
				</ul>
			</div>

			<!-- Retry button -->
			<button
				onclick={retry}
				class="mt-8 flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-medium text-white transition-all hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Try Again
			</button>

			<!-- Auto-reconnect message -->
			<p class="mt-4 text-xs text-slate-500">
				Don't worry — we'll automatically reconnect when your connection is restored.
			</p>
		</div>
	</div>
{/if}

{#if showReconnected}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 transform"
	>
		<div
			transition:scale={{ duration: 300, easing: backOut, start: 0.9 }}
			class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 shadow-lg backdrop-blur-sm"
		>
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
				<svg class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
				</svg>
			</div>
			<div>
				<p class="font-medium text-emerald-300">You're back online!</p>
				<p class="text-sm text-emerald-400/70">Connection restored successfully.</p>
			</div>
		</div>
	</div>
{/if}
