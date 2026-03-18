<script lang="ts">
	import './style.css';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import logo from '$lib/images/cropwatch_static.svg';
	import ADD_PERSON_ICON from '$lib/images/icons/person_add.svg';
	import FORGOT_SHIELD_ICON from '$lib/images/icons/forgot_shield.svg';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
    import { isStrongPassword } from '$lib/utils/strongPasswordCheck';
	import {
		loadRecaptchaScript,
		executeRecaptcha,
		unloadRecaptchaScript
	} from '$lib/utils/recaptcha';
	import { applyAction, enhance } from '$app/forms';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';

	interface Props {
		form: { message?: string } | null;
	}

	const toast = useCwToast();

	let { form }: Props = $props();

	$effect(() => {
		if (form?.message) {
			toast.add({ tone: 'danger', message: form.message });
		}
	});

	let loggingIn: boolean = $state(false);
	let loadingCaptcha: boolean = $state(true);
	let recaptchaReady: boolean = $state(false);
    let username: string = $state('');
    let password: string = $state('');

	const RECAPTCHA_TIMEOUT_MS = 12_000;
	const RECAPTCHA_MAX_LOAD_ATTEMPTS = 5;
	const RECAPTCHA_RETRY_DELAY_MS = 900;

	function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeoutId = window.setTimeout(() => {
				reject(new Error('Operation timed out'));
			}, timeoutMs);

			promise.then(resolve).catch(reject).finally(() => {
				window.clearTimeout(timeoutId);
			});
		});
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			window.setTimeout(resolve, ms);
		});
	}

	async function ensureRecaptchaLoaded(): Promise<boolean> {
		for (let attempt = 1; attempt <= RECAPTCHA_MAX_LOAD_ATTEMPTS; attempt++) {
			try {
				const loaded = await withTimeout(
					loadRecaptchaScript({
						setLoadingCaptcha: (loading: boolean) => {
							loadingCaptcha = loading;
						}
					}),
					RECAPTCHA_TIMEOUT_MS
				);

				if (loaded) {
					recaptchaReady = true;
					loadingCaptcha = false;
					return true;
				}
			} catch (error) {
				console.error(`reCAPTCHA load error (attempt ${attempt}):`, error);
			}

			recaptchaReady = false;
			loadingCaptcha = false;

			if (attempt < RECAPTCHA_MAX_LOAD_ATTEMPTS) {
				await sleep(RECAPTCHA_RETRY_DELAY_MS * attempt);
			}
		}

		return false;
	}

	async function getRecaptchaToken(): Promise<string> {
		if (!recaptchaReady) {
			const loaded = await ensureRecaptchaLoaded();
			if (!loaded) {
				throw new Error('reCAPTCHA not ready');
			}
		}

		try {
			return await withTimeout(executeRecaptcha('LOGIN'), RECAPTCHA_TIMEOUT_MS);
		} catch (firstError) {
			console.error('reCAPTCHA execute failed; retrying load once:', firstError);
			recaptchaReady = false;

			const loaded = await ensureRecaptchaLoaded();
			if (!loaded) {
				throw firstError;
			}

			return await withTimeout(executeRecaptcha('LOGIN'), RECAPTCHA_TIMEOUT_MS);
		}
	}

    function passwordStrengthCheck(password: string) {
        // Simple password strength check (can be enhanced with a library like zxcvbn)
        const result = isStrongPassword(password);
    }

	onMount(() => {
		void ensureRecaptchaLoaded();
	});

	onDestroy(() => {
		unloadRecaptchaScript();
	});
</script>

<svelte:head>
	<title>Login - CropWatch Temp</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt="CropWatch" class="logo-image" />
		</div>

		<h1 class="auth-title">Welcome to CropWatch!</h1>
		<p class="auth-subtitle">Sign-in to your account for your latest updates</p>

		<form
			method="POST"
			class="auth-form"
			use:enhance={async ({ formData, cancel }) => {
				if (loggingIn) {
					cancel();
					return;
				}

				loggingIn = true;

				try {
					const token = await getRecaptchaToken();
					if (typeof token !== 'string' || token.length === 0) {
						throw new Error('reCAPTCHA token missing');
					}
					formData.set('recaptchaToken', token);
				} catch (error) {
					console.error('reCAPTCHA execution error:', error);
					toast.add({
						message: 'Unable to verify site security. Please refresh the page and try again.',
						tone: 'danger'
					});
					loggingIn = false;
					cancel();
					return;
				}

				return async ({ result }) => {
					try {
						if (result.type === 'success') {
							await applyAction(result);
							toast.add({
								message: 'Login successful! Redirecting...',
								tone: 'success'
							});
							const redirectTo = typeof result.data === 'string' ? result.data : '/';
							await goto(redirectTo, { invalidateAll: true });
							return;
						}

						await applyAction(result);
					} finally {
						loggingIn = false;
					}
				};
			}}
		>
			<label class="field-block">
				<span class="field-label">EMAIL</span>
				<CwInput
                    bind:value={username}
					class="auth-input"
					name="email"
					type="email"
					required
					placeholder="you@example.com"
					autocomplete="email"
				/>
			</label>

			<label class="field-block">
				<span class="field-label">PASSWORD</span>
				<CwInput
                    bind:value={password}
                    onchange={(event) => passwordStrengthCheck(password)}
					class="auth-input"
					name="password"
					type="password"
					required
					placeholder="••••••••"
					autocomplete="current-password"
				/>
			</label>
            <span class="flex flex-row">
                
            </span>
			<CwButton
				class="auth-primary"
				type="submit"
				variant="primary"
				loading={loggingIn || loadingCaptcha}
				disabled={loggingIn || loadingCaptcha || !recaptchaReady || (!username || !password)}
				size="md"
				fullWidth={true}
			>
				<img src={KEY_ICON} alt="Sign in icon" class="h-4 w-4" />
				{loggingIn ? 'Signing in...' : loadingCaptcha ? 'Loading Site Security...' : 'Sign in'}
			</CwButton>

			<div class="action-grid">
				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto(resolve('/auth/create-account'))}
				>
					<img src={ADD_PERSON_ICON} alt="Create account icon" class="h-4 w-4" />
					Create Account
				</CwButton>

				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto(resolve('/auth/forgot-password'))}
				>
					<img src={FORGOT_SHIELD_ICON} alt="Forgot password icon" class="h-4 w-4" />
					Forgot Password
				</CwButton>
			</div>
		</form>

		<p class="security-copy">Protected by reCAPTCHA and CropWatch Security</p>
	</div>
</CwCard>
