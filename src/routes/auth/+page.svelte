<script lang="ts">
	import CWButton from '$lib/components/CWButton.svelte';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import logo from '$lib/images/cropwatch_static.svg';
	import ADD_PERSON_ICON from '$lib/images/icons/person_add.svg';
	import FORGOT_SHIELD_ICON from '$lib/images/icons/forgot_shield.svg';
	import { getToastContext } from '$lib/components/toast';
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { loadRecaptchaScript, executeRecaptcha, unloadRecaptchaScript } from '$lib/utils/recaptcha';
	import { enhance } from '$app/forms';

	let { form } = $props<{
		form: { message?: string; success?: boolean } | null;
	}>();

	let loggingIn: boolean = $state<boolean>(false);
	let loadingCaptcha: boolean = $state<boolean>(true);
	let recaptchaTokenInput: HTMLInputElement;

	const toast = getToastContext();

	onMount(async () => {
		// Preload reCAPTCHA script
		const recaptchaLoaded = await loadRecaptchaScript({
			setLoadingCaptcha: (loading) => {
				loadingCaptcha = loading;
			}
		});
		console.log('reCAPTCHA loaded:', recaptchaLoaded);
	});

	onDestroy(() => {
		// Cleanup if necessary
		unloadRecaptchaScript();
	});
</script>

<svelte:head>
	<title>Login - CropWatch Temp</title>
</svelte:head>

<main
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 text-slate-100"
>
	<!-- Animated background gradient orbs -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<!-- Large animated orbs -->
		<div
			class="animate-float-slow absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-sky-500/25 blur-3xl"
		></div>
		<div
			class="animate-float-slower absolute -bottom-48 -right-32 h-[600px] w-[600px] rounded-full bg-indigo-500/25 blur-3xl"
		></div>
		<div
			class="animate-float absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/20 blur-3xl"
		></div>
		<div
			class="animate-float-slow absolute -top-20 right-1/4 h-[350px] w-[350px] rounded-full bg-violet-500/20 blur-3xl"
		></div>

		<!-- Center glow behind the card -->
		<div
			class="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700/50 blur-3xl"
		></div>
	</div>

	<!-- Floating particles -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="animate-rise absolute bottom-0 left-[10%] h-1 w-1 rounded-full bg-sky-400/60"></div>
		<div
			class="animate-rise-slow absolute bottom-0 left-[20%] h-1.5 w-1.5 rounded-full bg-indigo-400/50"
		></div>
		<div
			class="animate-rise-slower absolute bottom-0 left-[35%] h-1 w-1 rounded-full bg-emerald-400/60"
		></div>
		<div class="animate-rise absolute bottom-0 left-[50%] h-2 w-2 rounded-full bg-sky-400/40"></div>
		<div
			class="animate-rise-slow absolute bottom-0 left-[65%] h-1 w-1 rounded-full bg-violet-400/60"
		></div>
		<div
			class="animate-rise-slower absolute bottom-0 left-[80%] h-1.5 w-1.5 rounded-full bg-sky-400/50"
		></div>
		<div
			class="animate-rise absolute bottom-0 left-[90%] h-1 w-1 rounded-full bg-indigo-400/60"
		></div>
	</div>

	<!-- Grid pattern overlay -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.04]"
		style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 48px 48px;"
	></div>

	<!-- Diagonal lines accent -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.02]"
		style="background-image: repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255,255,255,0.05) 100px, rgba(255,255,255,0.05) 101px);"
	></div>

	<!-- Radial vignette for depth -->
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.3)_60%,rgba(15,23,42,0.6)_100%)]"
	></div>

	<!-- Login card -->
	<div
		class="relative z-10 w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-sm"
	>
		<!-- Logo -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 shadow-lg">
				<img src={logo} alt="CropWatch" class="h-10 w-10" />
			</div>
		</div>

		<h1 class="text-center text-lg font-semibold text-slate-50">Welcome to CropWatch!</h1>
		<p class="mt-1 text-center text-sm text-slate-400">
			Sign-in to your account for your latest updates
		</p>

		{#if form?.message}
			<p
				class="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
			>
				{form.message}
			</p>
		{/if}

		<form
			method="POST"
			action="?/login"
			class="mt-6 space-y-4"
			use:enhance={async ({ formData, cancel }) => {
				loggingIn = true;

				try {
					// Get reCAPTCHA token before submitting
					const token = await executeRecaptcha('LOGIN');
					formData.set('recaptchaToken', token);
				} catch (error) {
					console.error('reCAPTCHA error:', error);
					toast.error('reCAPTCHA verification failed. Please try again.');
					loggingIn = false;
					cancel();
					return;
				}

				return async ({ result }) => {
					if (result.type === 'redirect') {
						// Invalidate all data to reload app state with authenticated session
						await invalidateAll();
						goto(result.location);
					} else if (result.type === 'failure') {
						const message = (result.data as { message?: string })?.message || 'Login failed';
						toast.error(message);
						loggingIn = false;
					} else if (result.type === 'error') {
						toast.error('An error occurred. Please try again.');
						loggingIn = false;
					}
				};
			}}
		>
			<label class="block text-sm text-slate-300">
				<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Email</span>
				<input
					name="email"
					type="email"
					required
					class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
					placeholder="you@example.com"
					autocomplete="email"
				/>
			</label>

			<label class="block text-sm text-slate-300">
				<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Password</span>
				<input
					name="password"
					type="password"
					required
					class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
					placeholder="••••••••"
					autocomplete="current-password"
				/>
			</label>

			<CWButton
				type="submit"
				variant="primary"
				loading={loggingIn || loadingCaptcha}
				disabled={loggingIn || loadingCaptcha}
				size="md"
				fullWidth={true}
			>
				<img src={KEY_ICON} alt="Sign in icon" class="h-5 w-5" />
				{loadingCaptcha ? 'Loading Site Security...' : 'Sign in'}
			</CWButton>

			<div class="flex flex-row gap-4">
				<CWButton
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto('/auth/register')}
				>
					<img src={ADD_PERSON_ICON} alt="Sign in icon" class="h-5 w-5" />
					Create Account
				</CWButton>

				<CWButton
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto('/auth/forgot-password')}
				>
					<img src={FORGOT_SHIELD_ICON} alt="Sign in icon" class="h-5 w-5" />
					Forgot Password
				</CWButton>
			</div>
		</form>

		<!-- Footer -->
		<p class="mt-6 text-center text-xs text-slate-400">
			Protected by reCAPTCHA and CropWatch Security
		</p>
	</div>

	<!-- Bottom ambient light reflection -->
	<div
		class="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"
	></div>
</main>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(10px, -15px) scale(1.02);
		}
		50% {
			transform: translate(-5px, 10px) scale(0.98);
		}
		75% {
			transform: translate(-15px, -5px) scale(1.01);
		}
	}

	@keyframes float-slow {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(-20px, 15px) scale(1.03);
		}
		66% {
			transform: translate(15px, -10px) scale(0.97);
		}
	}

	@keyframes float-slower {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(25px, -20px) scale(1.05);
		}
	}

	@keyframes rise {
		0% {
			transform: translateY(0) scale(1);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(-100vh) scale(0.5);
			opacity: 0;
		}
	}

	:global(.animate-float) {
		animation: float 8s ease-in-out infinite;
	}

	:global(.animate-float-slow) {
		animation: float-slow 12s ease-in-out infinite;
	}

	:global(.animate-float-slower) {
		animation: float-slower 16s ease-in-out infinite;
	}

	:global(.animate-rise) {
		animation: rise 15s ease-in-out infinite;
	}

	:global(.animate-rise-slow) {
		animation: rise 20s ease-in-out infinite;
		animation-delay: 2s;
	}

	:global(.animate-rise-slower) {
		animation: rise 25s ease-in-out infinite;
		animation-delay: 5s;
	}
</style>
