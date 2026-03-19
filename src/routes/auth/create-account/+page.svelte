<script lang="ts">
	import '../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import PERSON_ADD_ICON from '$lib/images/icons/person_add.svg';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import { isStrongPassword, type IPasswordValidationResult } from '$lib/utils/strongPasswordCheck';
	import {
		loadRecaptchaScript,
		executeRecaptcha,
		unloadRecaptchaScript
	} from '$lib/utils/recaptcha';
	import { applyAction, enhance } from '$app/forms';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

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

	$effect(() => {
		if (form?.message) {
			toast.add({ tone: 'danger', message: form.message });
		}
	});

	let submitting: boolean = $state(false);
	let loadingCaptcha: boolean = $state(true);
	let recaptchaReady: boolean = $state(false);

	let firstName: string = $state('');
	let lastName: string = $state('');
	let email: string = $state('');
	let company: string = $state('');
	let password: string = $state('');
	let confirmPassword: string = $state('');

	// Re-populate fields when the form action returns validation errors
	$effect(() => {
		if (form) {
			firstName = form.firstName ?? '';
			lastName = form.lastName ?? '';
			email = form.email ?? '';
			company = form.company ?? '';
		}
	});

	let agreedTerms: boolean = $state(false);
	let agreedPrivacy: boolean = $state(false);
	let agreedCookies: boolean = $state(false);

	/**
	 * Normalize Unicode to NFKC so that full-width digits, accented composites,
	 * etc.  are folded into their ASCII / composed equivalents before we evaluate
	 * the password.  For example, a full-width "１" (U+FF11) becomes "1".
	 */
	function normalizeInput(value: string): string {
		return value.normalize('NFKC');
	}

	function handlePasswordInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		password = normalizeInput(target.value);
		target.value = password;
	}

	function handleConfirmPasswordInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		confirmPassword = normalizeInput(target.value);
		target.value = confirmPassword;
	}

	// ── derived password-strength state ────────────────────────
	let passwordValidation: IPasswordValidationResult = $derived(isStrongPassword(password));

	let passwordsMatch: boolean = $derived(
		password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
	);

	let allConsentsGiven: boolean = $derived(agreedTerms && agreedPrivacy && agreedCookies);

	let canSubmit: boolean = $derived(
		firstName.trim().length > 0 &&
			lastName.trim().length > 0 &&
			email.trim().length > 0 &&
			company.trim().length > 0 &&
			passwordValidation.isValid &&
			passwordsMatch &&
			allConsentsGiven &&
			recaptchaReady &&
			!submitting &&
			!loadingCaptcha
	);

	// ── reCAPTCHA helpers (same pattern as login) ──────────────
	const RECAPTCHA_TIMEOUT_MS = 12_000;
	const RECAPTCHA_MAX_LOAD_ATTEMPTS = 5;
	const RECAPTCHA_RETRY_DELAY_MS = 900;

	function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		return new Promise<T>((res, rej) => {
			const id = window.setTimeout(() => rej(new Error('Operation timed out')), timeoutMs);
			promise
				.then(res)
				.catch(rej)
				.finally(() => window.clearTimeout(id));
		});
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((res) => window.setTimeout(res, ms));
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
			if (!loaded) throw new Error('reCAPTCHA not ready');
		}
		try {
			return await withTimeout(executeRecaptcha('REGISTER'), RECAPTCHA_TIMEOUT_MS);
		} catch (firstError) {
			console.error('reCAPTCHA execute failed; retrying load once:', firstError);
			recaptchaReady = false;
			const loaded = await ensureRecaptchaLoaded();
			if (!loaded) throw firstError;
			return await withTimeout(executeRecaptcha('REGISTER'), RECAPTCHA_TIMEOUT_MS);
		}
	}

	onMount(() => {
		void ensureRecaptchaLoaded();
	});

	onDestroy(() => {
		unloadRecaptchaScript();
	});
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
			<a href={resolve('/auth/login')} class="auth-link">{m.auth_sign_in_existing_account()}</a>
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
					const token = await getRecaptchaToken();
					if (typeof token !== 'string' || token.length === 0) {
						throw new Error('reCAPTCHA token missing');
					}
					formData.set('recaptchaToken', token);
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

				// Inject consent flags (hidden inputs would work too but this is cleaner)
				formData.set('agreedTerms', String(agreedTerms));
				formData.set('agreedPrivacy', String(agreedPrivacy));
				formData.set('agreedCookies', String(agreedCookies));

				return async ({ result }) => {
					try {
						if (result.type === 'redirect') {
							await goto(result.location, { invalidateAll: true });
							return;
						}
						await applyAction(result);
					} finally {
						submitting = false;
					}
				};
			}}
		>
			<!-- Name row -->
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

			<!-- Email -->
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

			<!-- Password -->
			<label class="field-block">
				<span class="field-label">{m.auth_password_label_required()}</span>
				<CwInput
					value={password}
					oninput={handlePasswordInput}
					class="auth-input"
					name="password"
					type="password"
					required
					placeholder={m.auth_password_placeholder()}
					autocomplete="new-password"
				/>
			</label>

			<!-- Password strength checklist -->
			{#if password.length > 0}
				<ul class="pw-checklist" aria-label={m.auth_password_requirements()}>
					<li class:met={passwordValidation.hasMinLength}>
						<span class="pw-icon">{passwordValidation.hasMinLength ? '✓' : '○'}</span>
						{m.auth_password_requirement_length()}
					</li>
					<li class:met={passwordValidation.hasLowerCase}>
						<span class="pw-icon">{passwordValidation.hasLowerCase ? '✓' : '○'}</span>
						{m.auth_password_requirement_lowercase()}
					</li>
					<li class:met={passwordValidation.hasUpperCase}>
						<span class="pw-icon">{passwordValidation.hasUpperCase ? '✓' : '○'}</span>
						{m.auth_password_requirement_uppercase()}
					</li>
					<li class:met={passwordValidation.hasNumber}>
						<span class="pw-icon">{passwordValidation.hasNumber ? '✓' : '○'}</span>
						{m.auth_password_requirement_number()}
					</li>
					<li class:met={passwordValidation.hasSymbol}>
						<span class="pw-icon">{passwordValidation.hasSymbol ? '✓' : '○'}</span>
						{m.auth_password_requirement_symbol()}
					</li>
				</ul>
			{/if}

			<!-- Confirm password -->
			<label class="field-block">
				<span class="field-label">{m.auth_confirm_password_label_required()}</span>
				<CwInput
					value={confirmPassword}
					oninput={handleConfirmPasswordInput}
					class="auth-input"
					name="confirmPassword"
					type="password"
					required
					placeholder={m.auth_password_placeholder()}
					autocomplete="new-password"
				/>
			</label>

			{#if confirmPassword.length > 0}
				<p class="pw-match-hint" class:pw-match-ok={passwordsMatch} class:pw-match-fail={!passwordsMatch}>
					{passwordsMatch ? m.auth_passwords_match() : m.auth_passwords_do_not_match()}
				</p>
			{/if}

			<!-- Company -->
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

			<!-- Consent checkboxes -->
			<fieldset class="consent-group">
				<legend class="field-label">{m.auth_required_agreements_label()}</legend>

				<label class="consent-item">
					<input type="checkbox" bind:checked={agreedTerms} class="consent-checkbox" />
					<span>
						{m.auth_agree_to()}
						<a href="https://app.cropwatch.io/legal/EULA" target="_blank" rel="noopener noreferrer" class="auth-link">{m.auth_terms_of_service()}</a>
					</span>
				</label>

				<label class="consent-item">
					<input type="checkbox" bind:checked={agreedPrivacy} class="consent-checkbox" />
					<span>
						{m.auth_agree_to()}
						<a href="https://app.cropwatch.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer" class="auth-link">{m.auth_privacy_policy()}</a>
					</span>
				</label>

				<label class="consent-item">
					<input type="checkbox" bind:checked={agreedCookies} class="consent-checkbox" />
					<span>
						{m.auth_agree_to()}
						<a href="https://app.cropwatch.io/legal/cookie-policy" target="_blank" rel="noopener noreferrer" class="auth-link">{m.auth_cookie_policy()}</a>
					</span>
				</label>

				{#if !allConsentsGiven && (agreedTerms || agreedPrivacy || agreedCookies)}
					<p class="consent-hint">{m.auth_all_three_required()}</p>
				{/if}
			</fieldset>

			<!-- Submit -->
			<CwButton
				class="auth-primary"
				type="submit"
				variant="primary"
				loading={submitting || loadingCaptcha}
				disabled={!canSubmit}
				size="md"
				fullWidth={true}
			>
				<img src={PERSON_ADD_ICON} alt={m.auth_create_account()} class="h-4 w-4" />
				{submitting
					? m.auth_creating_account()
					: loadingCaptcha
						? m.auth_loading_site_security()
						: m.auth_create_account()}
			</CwButton>

			<CwButton
				class="auth-secondary"
				type="button"
				variant="secondary"
				size="md"
				fullWidth={true}
				onclick={() => goto(resolve('/auth/login'))}
			>
				<img src={KEY_ICON} alt={m.auth_sign_in()} class="h-4 w-4" />
				{m.auth_sign_in_instead()}
			</CwButton>
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

	/* ── Name row (side-by-side on wider screens) ──────────── */
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

	/* ── Password strength checklist ───────────────────────── */
	.pw-checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.25rem;
		font-size: 0.84rem;
		color: rgb(170 185 210);
	}

	.pw-checklist li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: color 0.15s;
	}

	.pw-checklist li.met {
		color: rgb(72 220 170);
	}

	.pw-icon {
		display: inline-flex;
		width: 1rem;
		justify-content: center;
		font-weight: 600;
	}

	/* ── Password match hint ───────────────────────────────── */
	.pw-match-hint {
		margin: 0;
		font-size: 0.84rem;
		transition: color 0.15s;
	}

	.pw-match-ok {
		color: rgb(72 220 170);
	}

	.pw-match-fail {
		color: rgb(255 140 140);
	}

	/* ── Consent checkboxes ────────────────────────────────── */
	.consent-group {
		border: 1px solid rgb(58 84 126 / 60%);
		border-radius: 0.8rem;
		padding: 0.9rem 1rem;
		margin: 0;
		display: grid;
		gap: 0.6rem;
	}

	.consent-group legend {
		padding: 0 0.4rem;
	}

	.consent-item {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		font-size: 0.92rem;
		color: rgb(200 215 235);
		cursor: pointer;
	}

	.consent-checkbox {
		margin-top: 0.18rem;
		width: 1.1rem;
		height: 1.1rem;
		accent-color: rgb(56 137 203);
		cursor: pointer;
		flex-shrink: 0;
	}

	.consent-hint {
		margin: 0;
		font-size: 0.82rem;
		color: rgb(255 200 120);
	}
</style>
