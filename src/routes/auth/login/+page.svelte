<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import './style.css';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import HELP_ICON from '$lib/images/icons/help.svg';
	import PERSON_ADD_ICON from '$lib/images/icons/person_add.svg';
	import logo from '$lib/images/cropwatch_static.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { runRecaptchaAction, warmupRecaptcha } from '$lib/utils/recaptcha';
	import { applyAction, enhance } from '$app/forms';
	import { readLoginReason, readRedirectPath, type LoginReason } from '$lib/utils/auth-redirect';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { cwInputLabels } from '$lib/i18n/cwuiLabels';

	const toast = useCwToast();

	let loggingIn: boolean = $state(false);
	let username: string = $state('');
	let password: string = $state('');
	let redirectPath = $derived(readRedirectPath(page.url.searchParams, ''));

	// Why the visitor was sent here (`?reason=`, set by the server hook and the logout action).
	// Plain 'auth-required' gets no note: the heading already asks them to sign in.
	const REASON_MESSAGES: Partial<Record<LoginReason, () => string>> = {
		expired: m.auth_login_reason_expired,
		'signed-out': m.auth_login_reason_signed_out,
		'password-reset': m.auth_login_reason_password_reset,
		'error-recovery': m.auth_login_reason_error_recovery
	};
	let reasonMessage = $derived.by(() => {
		const reason = readLoginReason(page.url.searchParams);
		return reason ? REASON_MESSAGES[reason] : undefined;
	});

	onMount(() => {
		void warmupRecaptcha();
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

		{#if reasonMessage}
			<p id="login-reason-alert" class="auth-alert" role="status">
				{reasonMessage()}
			</p>
		{/if}

		<form
			id="login-form"
			method="POST"
			class="auth-form"
			use:enhance={async ({ formData, cancel }) => {
				if (loggingIn) {
					cancel();
					return;
				}

				loggingIn = true;

				try {
					formData.set('recaptchaToken', await runRecaptchaAction('LOGIN'));
				} catch (error) {
					console.error('reCAPTCHA execution error:', error);
					toast.add({
						message: m.auth_security_try_again(),
						tone: 'danger'
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
					id="login-email-input"
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
					labels={cwInputLabels()}
					id="login-password-input"
					bind:value={password}
					class="auth-input"
					name="password"
					type="password"
					required
					placeholder={m.auth_password_placeholder()}
					autocomplete="current-password"
				/>
			</label>
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				id="login-forgot-password-link"
				class="auth-text-link auth-text-link--end"
				href={redirectPath
					? `${resolve('/auth/forgot-password')}?redirect=${encodeURIComponent(redirectPath)}`
					: resolve('/auth/forgot-password')}
			>
				<Icon src={HELP_ICON} />
				{m.auth_forgot_password()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<CwButton
				id="login-submit-button"
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
			<a
				id="login-create-account-link"
				class="auth-button-link auth-button-link--secondary"
				href={redirectPath
					? `${resolve('/auth/create-account')}?redirect=${encodeURIComponent(redirectPath)}`
					: resolve('/auth/create-account')}
			>
				<Icon src={PERSON_ADD_ICON} />
				{m.auth_create_account()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</form>

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>
