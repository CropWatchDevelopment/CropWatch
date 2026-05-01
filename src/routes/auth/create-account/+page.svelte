<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import '../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import PERSON_ADD_ICON from '$lib/images/icons/person_add.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { createAuthRecaptcha } from '$lib/auth/auth-recaptcha.svelte';
	import { isStrongPassword, type IPasswordValidationResult } from '$lib/utils/strongPasswordCheck';
	import { applyAction, enhance } from '$app/forms';
	import { readRedirectPath } from '$lib/utils/auth-redirect';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import CreateAccountPasswordFields from './CreateAccountPasswordFields.svelte';
	import CreateAccountConsentFields from './CreateAccountConsentFields.svelte';

	interface Props {
		form: {
			message?: string;
			firstName?: string;
			lastName?: string;
			email?: string;
			company?: string;
		} | null;
	}

	const toast = useCwToast();

	let { form }: Props = $props();

	let submitting: boolean = $state(false);
	const recaptcha = createAuthRecaptcha();

	let firstName: string = $state('');
	let lastName: string = $state('');
	let email: string = $state('');
	let company: string = $state('');
	let password: string = $state('');
	let confirmPassword: string = $state('');

	let agreedTerms: boolean = $state(false);
	let agreedPrivacy: boolean = $state(false);
	let agreedCookies: boolean = $state(false);

	let passwordValidation: IPasswordValidationResult = $derived(isStrongPassword(password));

	let passwordsMatch: boolean = $derived(
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
	);

	let allConsentsGiven: boolean = $derived(agreedTerms && agreedPrivacy && agreedCookies);
	let redirectPath = $derived(readRedirectPath(page.url.searchParams, ''));

	let canSubmit: boolean = $derived(
		firstName.trim().length > 0 &&
			lastName.trim().length > 0 &&
			email.trim().length > 0 &&
			company.trim().length > 0 &&
			passwordValidation.isValid &&
			passwordsMatch &&
			allConsentsGiven &&
			!submitting
	);

	onMount(() => {
		void recaptcha.warmup();
	});

	function authPath(path: '/auth/login'): string {
		return `${resolve(path)}${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`;
	}

	function navigateWithRedirect(event: MouseEvent, path: '/auth/login') {
		event.preventDefault();
		window.location.assign(authPath(path));
	}
</script>

<svelte:head>
	<title>{m.auth_create_account_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.auth_create_account()}</h1>
		<p class="auth-subtitle">
			{m.auth_or_prefix()}
			<a
				class="auth-link auth-link-button"
				href={resolve('/auth/login')}
				onclick={(event) => navigateWithRedirect(event, '/auth/login')}
			>
				{m.auth_sign_in_existing_account()}
			</a>
		</p>

		<form
			method="POST"
			class="auth-form"
			use:enhance={async ({ formData, cancel }) => {
				if (submitting) {
					cancel();
					return;
				}
				submitting = true;

				try {
					formData.set('recaptchaToken', await recaptcha.runAction('REGISTER'));
				} catch (error) {
					console.error('reCAPTCHA execution error:', error);
					toast.add({
						message: m.auth_security_try_again(),
						tone: 'danger'
					});
					submitting = false;
					cancel();
					return;
				}

				formData.set('agreedTerms', String(agreedTerms));
				formData.set('agreedPrivacy', String(agreedPrivacy));
				formData.set('agreedCookies', String(agreedCookies));

				return async ({ result }) => {
					try {
						if (result.type === 'failure' && typeof result.data?.message === 'string') {
							firstName = typeof result.data.firstName === 'string' ? result.data.firstName : '';
							lastName = typeof result.data.lastName === 'string' ? result.data.lastName : '';
							email = typeof result.data.email === 'string' ? result.data.email : '';
							company = typeof result.data.company === 'string' ? result.data.company : '';

							toast.add({
								message: result.data.message,
								tone: 'danger'
							});
						}

						await applyAction(result);
					} finally {
						submitting = false;
					}
				};
			}}
		>
			<div class="name-row">
				<label class="field-block">
					<span class="field-label">{m.auth_first_name_label_required()}</span>
					<CwInput
						bind:value={firstName}
						class="auth-input"
						name="firstName"
						type="text"
						required
						placeholder={m.auth_first_name_placeholder()}
						autocomplete="given-name"
					/>
				</label>

				<label class="field-block">
					<span class="field-label">{m.auth_last_name_label_required()}</span>
					<CwInput
						bind:value={lastName}
						class="auth-input"
						name="lastName"
						type="text"
						required
						placeholder={m.auth_last_name_placeholder()}
						autocomplete="family-name"
					/>
				</label>
			</div>

			<label class="field-block">
				<span class="field-label">{m.auth_email_label_required()}</span>
				<CwInput
					bind:value={email}
					class="auth-input"
					name="email"
					type="email"
					required
					placeholder={m.auth_email_placeholder()}
					autocomplete="email"
				/>
			</label>

			<CreateAccountPasswordFields
				bind:password
				bind:confirmPassword
				{passwordValidation}
				{passwordsMatch}
			/>

			<label class="field-block">
				<span class="field-label">{m.auth_company_name_label_required()}</span>
				<CwInput
					bind:value={company}
					class="auth-input"
					name="company"
					type="text"
					required
					placeholder={m.auth_company_name_placeholder()}
					autocomplete="organization"
				/>
			</label>

			<CreateAccountConsentFields
				bind:agreedTerms
				bind:agreedPrivacy
				bind:agreedCookies
				{allConsentsGiven}
			/>

			<CwButton
				class="auth-primary"
				type="submit"
				variant="primary"
				loading={submitting}
				disabled={!canSubmit}
				size="md"
				fullWidth={true}
			>
				<Icon src={PERSON_ADD_ICON} alt={m.auth_create_account()} class="h-4 w-4" />
				{submitting ? m.auth_creating_account() : m.auth_create_account()}
			</CwButton>

			<a
				class="auth-button-link auth-button-link--secondary"
				href={resolve('/auth/login')}
				onclick={(event) => navigateWithRedirect(event, '/auth/login')}
			>
				<Icon src={KEY_ICON} alt={m.auth_sign_in()} class="h-4 w-4" />
				{m.auth_sign_in_instead()}
			</a>
		</form>

		<p class="security-copy">{m.auth_security_copy()}</p>
	</div>
</CwCard>

<style>
	.auth-link {
		color: rgb(120 180 240);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.auth-link:hover {
		color: rgb(160 205 255);
	}

	.auth-link-button {
		padding: 0;
		border: 0;
		background: transparent;
		font: inherit;
		cursor: pointer;
	}

	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	@media (max-width: 420px) {
		.name-row {
			grid-template-columns: 1fr;
		}
	}
</style>
