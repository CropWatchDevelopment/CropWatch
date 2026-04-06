<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
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

			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a
				class="auth-button-link auth-button-link--primary"
				href={redirectPath
					? `${resolve('/auth/login')}?redirect=${encodeURIComponent(redirectPath)}`
					: resolve('/auth/login')}
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

				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<div class="action-grid">
					<a
						class="auth-button-link auth-button-link--secondary"
						href={redirectPath
							? `${resolve('/auth/login')}?redirect=${encodeURIComponent(redirectPath)}`
							: resolve('/auth/login')}
					>
						<Icon src={BACK_ICON} alt={m.auth_back_to_login()} class="h-4 w-4" />
						{m.auth_back_to_login()}
					</a>

					<a
						class="auth-button-link auth-button-link--secondary"
						href={redirectPath
							? `${resolve('/auth/create-account')}?redirect=${encodeURIComponent(redirectPath)}`
							: resolve('/auth/create-account')}
					>
						<Icon src={ADD_PERSON_ICON} alt={m.auth_create_account()} class="h-4 w-4" />
						{m.auth_create_account()}
					</a>
				</div>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</form>
		{/if}

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>

<style>
	:global(.auth-card.cw-card) {
		width: 100%;
		border-radius: 1rem;
		border-color: rgb(65 91 136 / 60%);
		background: linear-gradient(180deg, rgb(11 27 62 / 95%) 0%, rgb(11 25 58 / 93%) 100%);
		box-shadow: 0 34px 90px rgb(2 8 24 / 70%);
		overflow: hidden;
	}

	:global(.auth-card .cw-card__body) {
		padding: 0;
	}

	.auth-shell {
		padding: 1.8rem 1.4rem 1rem;
	}

	.logo-frame {
		display: grid;
		height: 3.95rem;
		width: 3.95rem;
		place-items: center;
		margin: 0 auto 1.35rem;
		border-radius: 0.9rem;
		border: 1px solid rgb(61 88 130 / 56%);
		background: linear-gradient(180deg, rgb(19 42 85 / 90%), rgb(15 33 71 / 88%));
		box-shadow: inset 0 1px 0 rgb(128 163 214 / 15%);
	}

	.logo-image {
		height: 2rem;
		width: 2rem;
	}

	.auth-title {
		margin: 0;
		text-align: center;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: rgb(239 245 255);
	}

	.auth-subtitle {
		margin: 0.45rem 0 1.3rem;
		text-align: center;
		font-size: 1rem;
		color: rgb(158 176 205);
	}

	.auth-form {
		display: grid;
		gap: 0.82rem;
	}

	.auth-button-link {
		display: inline-flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-sizing: border-box;
		border: 1px solid transparent;
		text-decoration: none;
		line-height: 1;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease,
			box-shadow 120ms ease;
	}

	.auth-button-link:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgb(70 137 220 / 26%);
	}

	.auth-button-link--primary {
		min-height: 3rem;
		border-radius: 0.8rem;
		border-color: rgb(83 149 213 / 70%);
		background: linear-gradient(180deg, #3889cb 0%, #2f74b3 100%);
		color: rgb(242 248 255);
		font-size: 1.12rem;
		font-weight: 500;
	}

	.auth-button-link--primary:hover {
		border-color: rgb(108 167 228 / 76%);
		background: linear-gradient(180deg, #4395d8 0%, #347fbe 100%);
	}

	.field-block {
		display: grid;
		gap: 0.42rem;
	}

	.field-label {
		font-size: 0.84rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		color: rgb(151 171 201);
	}

	:global(.auth-input .cw-input__field) {
		min-height: 3rem;
		border-color: rgb(58 84 126 / 80%);
		border-radius: 0.8rem;
		background: rgb(23 41 79 / 78%);
		padding: 0.78rem 0.9rem;
		font-size: 1.06rem;
		color: rgb(223 236 255);
	}

	:global(.auth-input .cw-input__field::placeholder) {
		color: rgb(140 162 196);
	}

	:global(.auth-input .cw-input__field:focus) {
		border-color: rgb(86 140 214 / 90%);
		box-shadow: 0 0 0 2px rgb(70 137 220 / 26%);
	}

	:global(.auth-primary.cw-button) {
		min-height: 3rem;
		border-radius: 0.8rem;
		border-color: rgb(83 149 213 / 70%);
		background: linear-gradient(180deg, #3889cb 0%, #2f74b3 100%);
		color: rgb(242 248 255);
		font-size: 1.12rem;
		font-weight: 500;
	}

	:global(.auth-primary.cw-button:hover:not(:disabled)) {
		border-color: rgb(108 167 228 / 76%);
		background: linear-gradient(180deg, #4395d8 0%, #347fbe 100%);
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.auth-button-link--secondary {
		min-height: 2.48rem;
		border-radius: 0.75rem;
		border-color: rgb(72 96 136 / 80%);
		background: rgb(33 53 90 / 84%);
		color: rgb(218 229 245);
		font-size: 1rem;
		font-weight: 450;
	}

	.auth-button-link--secondary:hover {
		border-color: rgb(95 126 174 / 85%);
		background: rgb(39 62 102 / 88%);
	}

	:global(.auth-secondary.cw-button) {
		min-height: 2.48rem;
		border-radius: 0.75rem;
		border-color: rgb(72 96 136 / 80%);
		background: rgb(33 53 90 / 84%);
		color: rgb(218 229 245);
		font-size: 1rem;
		font-weight: 450;
	}

	:global(.auth-secondary.cw-button:hover:not(:disabled)) {
		border-color: rgb(95 126 174 / 85%);
		background: rgb(39 62 102 / 88%);
	}

	.security-copy {
		margin: 1.25rem 0 0;
		text-align: center;
		font-size: 0.84rem;
		color: rgb(135 155 187);
	}

	@media (max-width: 420px) {
		.auth-shell {
			padding: 1.45rem 1rem 0.85rem;
		}

		.action-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
