<script lang="ts">
	import './style.css';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import logo from '$lib/images/cropwatch_static.svg';
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
	import { m } from '$lib/paraglide/messages.js';

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

			promise
				.then(resolve)
				.catch(reject)
				.finally(() => {
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

	function passwordStrengthCheck(value: string) {
		void isStrongPassword(value);
	}

	onMount(() => {
		void ensureRecaptchaLoaded();
	});

	onDestroy(() => {
		unloadRecaptchaScript();
	});
</script>

<svelte:head>
	<title>{m.auth_login_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.auth_login_heading()}</h1>
		<p class="auth-subtitle">{m.auth_login_subtitle()}</p>

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
						message: m.auth_security_refresh_error(),
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
								message: m.auth_login_success_redirecting(),
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
				<span class="field-label">{m.auth_email_label()}</span>
				<CwInput
					bind:value={username}
					class="auth-input"
					name="email"
					type="email"
					required
					placeholder={m.auth_email_placeholder()}
					autocomplete="email"
				/>
			</label>

			<label class="field-block">
				<span class="field-label">{m.auth_password_label()}</span>
				<CwInput
					bind:value={password}
					onchange={() => passwordStrengthCheck(password)}
					class="auth-input"
					name="password"
					type="password"
					required
					placeholder={m.auth_password_placeholder()}
					autocomplete="current-password"
				/>
			</label>
			<span class="flex flex-row"></span>
			<CwButton
				class="auth-primary"
				type="submit"
				variant="primary"
				loading={loggingIn || loadingCaptcha}
				disabled={loggingIn || loadingCaptcha || !recaptchaReady || !username || !password}
				size="md"
				fullWidth={true}
			>
				<img src={KEY_ICON} alt={m.auth_sign_in()} class="h-4 w-4" />
				{loggingIn
					? m.auth_signing_in()
					: loadingCaptcha
						? m.auth_loading_site_security()
						: m.auth_sign_in()}
			</CwButton>

			<div class="action-grid">
				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="lg"
					fullWidth={true}
					onclick={() => goto(resolve('/auth/create-account'))}
				>
					{m.auth_create_account()}
				</CwButton>

				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="lg"
					fullWidth={true}
					onclick={() => goto(resolve('/auth/forgot-password'))}
				>
					<span class="text-sm">{m.auth_forgot_password()}</span>
				</CwButton>
			</div>
		</form>

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>
