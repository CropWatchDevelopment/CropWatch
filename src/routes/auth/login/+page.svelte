<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import './style.css';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import logo from '$lib/images/cropwatch_static.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { createAuthRecaptcha } from '$lib/auth/auth-recaptcha.svelte';
	import { isStrongPassword } from '$lib/utils/strongPasswordCheck';
	import { applyAction, enhance } from '$app/forms';
	import { readLoginReason, readRedirectPath } from '$lib/utils/auth-redirect';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

	const toast = useCwToast();

	let loggingIn: boolean = $state(false);
	let username: string = $state('');
	let password: string = $state('');
	const recaptcha = createAuthRecaptcha();
	let redirectPath = $derived(readRedirectPath(page.url.searchParams, ''));
	let loginReason = $derived(readLoginReason(page.url.searchParams));
	let reasonMessage = $derived.by(() => {
		switch (loginReason) {
			case 'auth-required':
				return m.auth_login_reason_auth_required();
			case 'expired':
				return m.auth_login_reason_expired();
			case 'signed-out':
				return m.auth_login_reason_signed_out();
			case 'password-reset':
				return m.auth_login_reason_password_reset();
			case 'error-recovery':
				return m.auth_login_reason_error_recovery();
			default:
				return null;
		}
	});

	function passwordStrengthCheck(value: string) {
		void isStrongPassword(value);
	}

	onMount(() => {
		void recaptcha.warmup();
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
					formData.set('recaptchaToken', await recaptcha.runAction('LOGIN'));
				} catch (error) {
					console.error('reCAPTCHA execution error:', error);
					toast.add({
						message: m.auth_security_try_again(),
						tone: 'danger',
						duration: 7000
					});
					loggingIn = false;
					cancel();
					return;
				}

				return async ({ result }) => {
					try {
						if (result.type === 'failure' && typeof result.data?.message === 'string') {
							toast.add({
								message: result.data.message,
								tone: 'danger'
							});
						}

						if (result.type === 'redirect') {
							toast.add({
								message: m.auth_login_success_redirecting(),
								tone: 'success'
							});
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
				loading={loggingIn}
				disabled={loggingIn || !username || !password}
				size="md"
				fullWidth={true}
			>
				<Icon src={KEY_ICON} alt={m.auth_sign_in()} class="h-4 w-4" />
				{loggingIn ? m.auth_signing_in() : m.auth_sign_in()}
			</CwButton>

			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<div class="action-grid">
				<a
					class="auth-button-link auth-button-link--secondary"
					href={redirectPath
						? `${resolve('/auth/create-account')}?redirect=${encodeURIComponent(redirectPath)}`
						: resolve('/auth/create-account')}
				>
					{m.auth_create_account()}
				</a>

				<a
					class="auth-button-link auth-button-link--secondary"
					href={redirectPath
						? `${resolve('/auth/forgot-password')}?redirect=${encodeURIComponent(redirectPath)}`
						: resolve('/auth/forgot-password')}
				>
					<span class="text-sm">{m.auth_forgot_password()}</span>
				</a>
			</div>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</form>

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>
