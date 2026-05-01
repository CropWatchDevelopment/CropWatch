<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import '../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import ADD_PERSON_ICON from '$lib/images/icons/person_add.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { createAuthRecaptcha } from '$lib/auth/auth-recaptcha.svelte';
	import { applyAction, enhance } from '$app/forms';
	import { readRedirectPath } from '$lib/utils/auth-redirect';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		form: { message?: string; success?: boolean } | null;
	}

	const toast = useCwToast();

	let { form }: Props = $props();

	let submitting: boolean = $state(false);
	const recaptcha = createAuthRecaptcha();
	let sent: boolean = $derived(form?.success === true);
	let redirectPath = $derived(readRedirectPath(page.url.searchParams, ''));

	onMount(() => {
		void recaptcha.warmup();
	});

	function authPath(path: '/auth/login' | '/auth/create-account'): string {
		return `${resolve(path)}${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`;
	}

	function navigateWithRedirect(event: MouseEvent, path: '/auth/login' | '/auth/create-account') {
		event.preventDefault();
		window.location.assign(authPath(path));
	}
</script>

<svelte:head>
	<title>{m.auth_forgot_password_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		{#if sent}
			<h1 class="auth-title">{m.auth_check_email_heading()}</h1>
			<p class="auth-subtitle">{m.auth_forgot_password_sent_body()}</p>

			<a
				class="auth-button-link auth-button-link--primary"
				href={resolve('/auth/login')}
				onclick={(event) => navigateWithRedirect(event, '/auth/login')}
			>
				<Icon src={BACK_ICON} alt={m.auth_back_to_login()} class="h-4 w-4" />
				{m.auth_back_to_login()}
			</a>
		{:else}
			<h1 class="auth-title">{m.auth_forgot_password()}</h1>
			<p class="auth-subtitle">{m.auth_forgot_password_subtitle()}</p>

			<form
				method="POST"
				action="?/forgotPassword"
				class="auth-form"
				use:enhance={async ({ formData, cancel }) => {
					if (submitting) {
						cancel();
						return;
					}
					submitting = true;

					try {
						formData.set('recaptchaToken', await recaptcha.runAction('FORGOT_PASSWORD'));
					} catch (err) {
						console.error('reCAPTCHA token failed:', err);
						toast.add({ message: m.auth_security_try_again(), tone: 'danger' });
						submitting = false;
						cancel();
						return;
					}

					return async ({ result }) => {
						if (result.type === 'failure' && typeof result.data?.message === 'string') {
							toast.add({
								message: result.data.message,
								tone: 'danger'
							});
						}

						submitting = false;
						await applyAction(result);
					};
				}}
			>
				<label class="field-block">
					<span class="field-label">{m.auth_email_label()}</span>
					<CwInput
						class="auth-input"
						name="email"
						type="email"
						required
						placeholder={m.auth_email_placeholder()}
						autocomplete="email"
					/>
				</label>

				<CwButton
					class="auth-primary"
					type="submit"
					variant="primary"
					size="md"
					fullWidth={true}
					disabled={submitting}
				>
					{#if submitting}
						{m.auth_sending()}
					{:else}
						<Icon src={KEY_ICON} alt={m.auth_send_reset_link()} class="h-4 w-4" />
						{m.auth_send_reset_link()}
					{/if}
				</CwButton>

				<div class="action-grid">
					<a
						class="auth-button-link auth-button-link--secondary"
						href={resolve('/auth/login')}
						onclick={(event) => navigateWithRedirect(event, '/auth/login')}
					>
						<Icon src={BACK_ICON} alt={m.auth_back_to_login()} class="h-4 w-4" />
						{m.auth_back_to_login()}
					</a>

					<a
						class="auth-button-link auth-button-link--secondary"
						href={resolve('/auth/create-account')}
						onclick={(event) => navigateWithRedirect(event, '/auth/create-account')}
					>
						<Icon src={ADD_PERSON_ICON} alt={m.auth_create_account()} class="h-4 w-4" />
						{m.auth_create_account()}
					</a>
				</div>
			</form>
		{/if}

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>
