<script lang="ts">
	import CWButton from '$lib/components/CWButton.svelte';
	import logo from '$lib/images/cropwatch_static.svg';
	import ADD_PERSON_ICON from '$lib/images/icons/person_add.svg';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadRecaptchaScript, executeRecaptcha } from '$lib/utils/recaptcha';
	import { getToastContext } from '$lib/components/toast';
	import { enhance } from '$app/forms';

	let { form } = $props<{
		form: { message?: string; success?: boolean } | null;
	}>();

	let registering: boolean = $state(false);

	// Form fields
	let email: string = $state('');
	let password: string = $state('');
	let confirmPassword: string = $state('');
	let fullName: string = $state('');
	let employer: string = $state('');

	// Password visibility
	let showPassword: boolean = $state(false);

	// Legal checkboxes
	let acceptedEula: boolean = $state(false);
	let acceptedPrivacy: boolean = $state(false);
	let acceptedTerms: boolean = $state(false);

	// Track if links were opened
	let eulaOpened: boolean = $state(false);
	let privacyOpened: boolean = $state(false);
	let termsOpened: boolean = $state(false);

	// Password validation
	const hasMinLength = $derived(password.length >= 8);
	const hasLowercase = $derived(/[a-z]/.test(password));
	const hasUppercase = $derived(/[A-Z]/.test(password));
	const hasNumber = $derived(/[0-9]/.test(password));
	const hasSymbol = $derived(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password));
	// Only allow ASCII printable characters (no unicode letters outside ASCII)
	const hasValidChars = $derived(/^[\x20-\x7E]*$/.test(password));
	const isPasswordValid = $derived(
		hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol && hasValidChars
	);
	const passwordsMatch = $derived(password === confirmPassword && password.length > 0);

	// Form validation
	const isFormValid = $derived(
		email.length > 0 &&
		isPasswordValid &&
		passwordsMatch &&
		fullName.length > 0 &&
		acceptedEula &&
		acceptedPrivacy &&
		acceptedTerms &&
		eulaOpened &&
		privacyOpened &&
		termsOpened
	);

	const toast = getToastContext();

	onMount(() => {
		// Preload reCAPTCHA script
		loadRecaptchaScript();
	});

	// Handle link clicks
	function openEula() {
		eulaOpened = true;
		window.open('https://cropwatch.io/legal/terms-of-service', '_blank');
	}

	function openPrivacy() {
		privacyOpened = true;
		window.open('https://cropwatch.io/legal/privacy-policy', '_blank');
	}

	function openTerms() {
		termsOpened = true;
		window.open('https://cropwatch.io/legal/terms-of-service', '_blank');
	}
</script>

<svelte:head>
	<title>Register - CropWatch Temp</title>
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

	<!-- Register card -->
	<div
		class="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
	>
		<!-- Logo -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 shadow-lg">
				<img src={logo} alt="CropWatch" class="h-10 w-10" />
			</div>
		</div>

		<h1 class="text-center text-lg font-semibold text-slate-50">Create Your Account</h1>
		<p class="mt-1 text-center text-sm text-slate-400">Joining is quick and easy, Register, Add devices, and start monitoring!</p>

		{#if form?.message}
			<p
				class={`mt-4 rounded-lg border px-3 py-2 text-sm ${
					form.success
						? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
						: 'border-amber-500/40 bg-amber-500/10 text-amber-100'
				}`}
			>
				{form.message}
			</p>
		{/if}

		{#if !form?.success}
			<form
				method="POST"
				action="?/register"
				class="mt-6 space-y-4"
				use:enhance={async ({ formData, cancel }) => {
					registering = true;
					
					try {
						const token = await executeRecaptcha('REGISTER');
						formData.set('recaptchaToken', token);
					} catch (error) {
						console.error('reCAPTCHA error:', error);
						toast.error('reCAPTCHA verification failed. Please try again.');
						registering = false;
						cancel();
						return;
					}

					return async ({ result, update }) => {
						registering = false;
						if (result.type === 'redirect') {
							goto(result.location);
						} else if (result.type === 'failure') {
							const message = (result.data as { message?: string })?.message || 'Registration failed';
							toast.error(message);
						} else if (result.type === 'success') {
							await update();
						} else if (result.type === 'error') {
							toast.error('An error occurred. Please try again.');
						}
					};
				}}
			>
				<!-- Full Name -->
				<label class="block text-sm text-slate-300">
					<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Full Name <span class="text-red-400">*</span></span>
					<input
						name="full_name"
						type="text"
						required
						bind:value={fullName}
						class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
						placeholder="John Doe"
						autocomplete="name"
					/>
				</label>

				<!-- Employer -->
				<label class="block text-sm text-slate-300">
					<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Employer / Organization</span>
					<input
						name="employer"
						type="text"
						bind:value={employer}
						class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
						placeholder="CropWatch Inc."
						autocomplete="organization"
					/>
				</label>

				<!-- Email -->
				<label class="block text-sm text-slate-300">
					<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Email <span class="text-red-400">*</span></span>
					<input
						name="email"
						type="email"
						required
						bind:value={email}
						class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
						placeholder="you@example.com"
						autocomplete="email"
					/>
				</label>

				<!-- Password -->
				<div class="block text-sm text-slate-300">
					<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Password <span class="text-red-400">*</span></span>
					<div class="relative">
						<input
							name="password"
							type={showPassword ? 'text' : 'password'}
							required
							bind:value={password}
							class="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 pr-12 text-slate-100 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
							placeholder="••••••••"
							autocomplete="new-password"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
						>
							{#if showPassword}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
					
					<!-- Password Requirements -->
					{#if password.length > 0}
						<div class="mt-2 space-y-1">
							<div class="flex items-center gap-2 text-xs {hasMinLength ? 'text-emerald-400' : 'text-slate-400'}">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									{#if hasMinLength}
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									{/if}
								</svg>
								At least 8 characters
							</div>
							<div class="flex items-center gap-2 text-xs {hasLowercase ? 'text-emerald-400' : 'text-slate-400'}">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									{#if hasLowercase}
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									{/if}
								</svg>
								One lowercase letter (a-z)
							</div>
							<div class="flex items-center gap-2 text-xs {hasUppercase ? 'text-emerald-400' : 'text-slate-400'}">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									{#if hasUppercase}
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									{/if}
								</svg>
								One uppercase letter (A-Z)
							</div>
							<div class="flex items-center gap-2 text-xs {hasNumber ? 'text-emerald-400' : 'text-slate-400'}">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									{#if hasNumber}
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									{/if}
								</svg>
								One number (0-9)
							</div>
							<div class="flex items-center gap-2 text-xs {hasSymbol ? 'text-emerald-400' : 'text-slate-400'}">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									{#if hasSymbol}
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									{/if}
								</svg>
								One symbol (!@#$%^&* etc.)
							</div>
							{#if !hasValidChars}
								<div class="flex items-center gap-2 text-xs text-red-400">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
									Only standard ASCII characters allowed
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Confirm Password -->
				<label class="block text-sm text-slate-300">
					<span class="mb-1 block text-xs uppercase tracking-wide text-slate-400">Confirm Password <span class="text-red-400">*</span></span>
					<input
						name="confirm_password"
						type={showPassword ? 'text' : 'password'}
						required
						bind:value={confirmPassword}
						class="w-full rounded-xl border bg-slate-800/50 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 transition focus:outline-none focus:ring-2
							{confirmPassword.length > 0 && !passwordsMatch
							? 'border-red-500 focus:border-red-500 focus:ring-red-500/40'
							: confirmPassword.length > 0 && passwordsMatch
								? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/40'
								: 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/40'}"
						placeholder="••••••••"
						autocomplete="new-password"
					/>
					{#if confirmPassword.length > 0 && !passwordsMatch}
						<p class="mt-1.5 text-xs text-red-400">Passwords do not match</p>
					{:else if confirmPassword.length > 0 && passwordsMatch}
						<p class="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
							Passwords match
						</p>
					{/if}
				</label>

				<!-- Legal Agreements -->
				<div class="space-y-3 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Legal Agreements</p>
					
					<!-- EULA -->
					<label class="flex items-start gap-3 text-sm text-slate-300">
						<input
							type="checkbox"
							name="accept_eula"
							bind:checked={acceptedEula}
							disabled={!eulaOpened}
							class="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<span class="flex-1">
							I have read and agree to the 
							<button
								type="button"
								onclick={openEula}
								class="text-sky-400 underline hover:text-sky-300"
							>
								End User License Agreement (EULA)
							</button>
							{#if !eulaOpened}
								<span class="ml-1 text-xs text-amber-400">(click to open first)</span>
							{/if}
						</span>
					</label>

					<!-- Privacy Policy -->
					<label class="flex items-start gap-3 text-sm text-slate-300">
						<input
							type="checkbox"
							name="accept_privacy"
							bind:checked={acceptedPrivacy}
							disabled={!privacyOpened}
							class="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<span class="flex-1">
							I have read and agree to the 
							<button
								type="button"
								onclick={openPrivacy}
								class="text-sky-400 underline hover:text-sky-300"
							>
								Privacy Policy
							</button>
							{#if !privacyOpened}
								<span class="ml-1 text-xs text-amber-400">(click to open first)</span>
							{/if}
						</span>
					</label>

					<!-- Terms of Service -->
					<label class="flex items-start gap-3 text-sm text-slate-300">
						<input
							type="checkbox"
							name="accept_terms"
							bind:checked={acceptedTerms}
							disabled={!termsOpened}
							class="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<span class="flex-1">
							I have read and agree to the 
							<button
								type="button"
								onclick={openTerms}
								class="text-sky-400 underline hover:text-sky-300"
							>
								Terms of Service
							</button>
							{#if !termsOpened}
								<span class="ml-1 text-xs text-amber-400">(click to open first)</span>
							{/if}
						</span>
					</label>
				</div>

				<CWButton 
					type="submit" 
					variant="primary" 
					loading={registering} 
					size="md" 
					fullWidth={true}
					disabled={!isFormValid}
				>
					<img src={ADD_PERSON_ICON} alt="Register icon" class="h-5 w-5" />
					Create Account
				</CWButton>
			</form>
		{/if}

		<div class="mt-4">
			<CWButton type="button" variant="secondary" size="md" fullWidth={true} onclick={() => goto('/auth')}>
				<img src={BACK_ICON} alt="Back icon" class="h-5 w-5" />
				Back to Sign In
			</CWButton>
		</div>

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
