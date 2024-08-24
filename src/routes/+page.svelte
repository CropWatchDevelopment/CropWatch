<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
    import TRACTOR from '$lib/images/UI/tractor.svg';
	import { onMount } from 'svelte';

    let deferredPrompt;
	let installButtonVisible = false;
	let output = '';

	onMount(() => {
		if ('BeforeInstallPromptEvent' in window) {
			showResult('⏳ BeforeInstallPromptEvent supported but not fired yet');
		} else {
			showResult('❌ BeforeInstallPromptEvent NOT supported');
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			installButtonVisible = true;
			showResult('✅ BeforeInstallPromptEvent fired', true);
		});

		window.addEventListener('appinstalled', (e) => {
			showResult('✅ AppInstalled fired', true);
		});
	});

	function showResult(text, append = false) {
		if (append) {
			document.querySelector('output').innerHTML += '<br>' + text;
		} else {
			document.querySelector('output').innerHTML = text;
		}
	}

	async function installApp() {
		console.log('installApp button clicked');
		if (deferredPrompt) {
			deferredPrompt.prompt();
			showResult('🆗 Installation Dialog opened');
			// Find out whether the user confirmed the installation or not
			const { outcome } = await deferredPrompt.userChoice;
			// The deferredPrompt can only be used once.
			deferredPrompt = null;
			// Act on the user's choice
			if (outcome === 'accepted') {
				showResult('😀 User accepted the install prompt.', true);
			} else if (outcome === 'dismissed') {
				showResult('😟 User dismissed the install prompt');
			}
			// Hide the install button
			// installButtonVisible = false;
		}
	}

    onMount(() => {
        if (browser) {
            goto('/app/dashboard');
        }
    })
</script>


<div class="w-full h-full flex justify-center items-center">
    <img src={TRACTOR} alt="logo" class="w-1/2" />
</div>
<p class="text-center w-full text-black">Loading...</p>

<div class="container">
	<h1>Installation Prompt Demo</h1>
	<p class="instructions">Load this PWA in a browser supporting beforeinstallprompt.</p>
	<section class="toolbar">
		{#if installButtonVisible}
			<button on:click={installApp}>Install this App</button>
		{/if}
	</section>
	<output>{@html output}</output>
</div>

<!-- <slot /> -->

<style>
	h1 {
		text-align: center;
	}

	.toolbar {
		width: 100%;
		display: flex;
		margin-top: 16px;
		justify-content: center;
	}

	.instructions {
		text-align: center;
		margin-bottom: 16px;
	}

	output {
		display: block;
		color: gray;
		margin: 32px 16px;
		text-align: center;
		border: 1px silver dashed;
		padding: 16px;
		border-radius: 16px;
	}

	button {
		display: block;
		font-size: 16px;
		border: 2px solid black;
		border-radius: 8px;
		padding: 16px;
		margin: 0 8px;
		text-transform: uppercase;
	}
</style>