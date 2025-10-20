<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	// Get page data (form action results)
	let { data } = $props();

	// Form data
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let company = $state('');
	let agreedToTerms = $state(false);
	let agreedToPrivacy = $state(false);
	let agreedToCookies = $state(false);
	let isSubmitting = $state(false);

	// Form validation
	let errors = $state({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
		confirmPassword: '',
		company: '',
		terms: ''
	});

	// Function to validate email format
	function isValidEmail(email: string): boolean {
		const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return regex.test(email);
	}

	type PasswordRequirementKey = 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol';

	const passwordRequirementPatterns: Record<Exclude<PasswordRequirementKey, 'length'>, RegExp> = {
		lowercase: /[a-z]/,
		uppercase: /[A-Z]/,
		number: /\d/,
		symbol: /[^A-Za-z0-9]/
	};

	const passwordRequirementEntries: Array<{ key: PasswordRequirementKey; label: string }> = [
		{ key: 'length', label: 'At least 8 characters' },
		{ key: 'lowercase', label: 'Contains a lowercase letter (a-z)' },
		{ key: 'uppercase', label: 'Contains an uppercase letter (A-Z)' },
		{ key: 'number', label: 'Contains a number (0-9)' },
		{ key: 'symbol', label: 'Contains a symbol (!@#$, etc.)' }
	];

	function meetsPasswordRequirements(value: string): boolean {
		return (
			value.length >= 8 &&
			passwordRequirementPatterns.lowercase.test(value) &&
			passwordRequirementPatterns.uppercase.test(value) &&
			passwordRequirementPatterns.number.test(value) &&
			passwordRequirementPatterns.symbol.test(value)
		);
	}

	function computePasswordRequirementStatus(
		value: string
	): Record<PasswordRequirementKey, boolean> {
		return {
			length: value.length >= 8,
			lowercase: passwordRequirementPatterns.lowercase.test(value),
			uppercase: passwordRequirementPatterns.uppercase.test(value),
			number: passwordRequirementPatterns.number.test(value),
			symbol: passwordRequirementPatterns.symbol.test(value)
		};
	}

	function getUnmetRequirementLabels(status: Record<PasswordRequirementKey, boolean>): string[] {
		const labels: string[] = [];

		for (const entry of passwordRequirementEntries) {
			if (!status[entry.key]) {
				labels.push(entry.label);
			}
		}

		return labels;
	}

	let passwordsMatch = $derived(confirmPassword.length > 0 && confirmPassword === password);

	// Function to validate the form
	function validateForm(): boolean {
		let isValid = true;
		errors = {
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			confirmPassword: '',
			company: '',
			terms: ''
		};

		// Validate first name
		if (!firstName.trim()) {
			errors.firstName = 'First name is required';
			isValid = false;
		}

		// Validate last name
		if (!lastName.trim()) {
			errors.lastName = 'Last name is required';
			isValid = false;
		}

		// Validate email
		if (!email.trim()) {
			errors.email = 'Email is required';
			isValid = false;
		} else if (!isValidEmail(email)) {
			errors.email = 'Please enter a valid email address';
			isValid = false;
		}

		// Validate password
		if (!password) {
			errors.password = 'Password is required';
			isValid = false;
		} else if (!meetsPasswordRequirements(password)) {
			errors.password =
				'Password must be at least 8 characters and include a lowercase letter, uppercase letter, number, and symbol';
			isValid = false;
		}

		// Validate password confirmation
		if (!confirmPassword) {
			errors.confirmPassword = 'Please confirm your password';
			isValid = false;
		} else if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
			isValid = false;
		}

		// Validate company
		if (!company.trim()) {
			errors.company = 'Company name is required';
			isValid = false;
		}

		// Validate terms agreement - ALL THREE MUST BE CHECKED
		if (!agreedToTerms || !agreedToPrivacy || !agreedToCookies) {
			errors.terms = 'You must agree to all terms and policies';
			isValid = false;
		}

		return isValid;
	}

	// Computed property to check if form is valid for submission
	let isFormValid = $derived(() => {
		return (
			firstName.trim() !== '' &&
			lastName.trim() !== '' &&
			email.trim() !== '' &&
			isValidEmail(email) &&
			password !== '' &&
			meetsPasswordRequirements(password) &&
			confirmPassword !== '' &&
			password === confirmPassword &&
			company.trim() !== '' &&
			agreedToTerms &&
			agreedToPrivacy &&
			agreedToCookies
		);
	});

	// Real-time field validation functions
	function validateFirstName() {
		if (!firstName.trim()) {
			errors.firstName = 'First name is required';
		} else {
			errors.firstName = '';
		}
	}

	function validateLastName() {
		if (!lastName.trim()) {
			errors.lastName = 'Last name is required';
		} else {
			errors.lastName = '';
		}
	}

	function validateEmailField() {
		if (!email.trim()) {
			errors.email = 'Email is required';
		} else if (!isValidEmail(email)) {
			errors.email = 'Please enter a valid email address';
		} else {
			errors.email = '';
		}
	}

	function validatePasswordField() {
		if (!password) {
			errors.password = 'Password is required';
		} else if (!meetsPasswordRequirements(password)) {
			errors.password =
				'Password must be at least 8 characters and include a lowercase letter, uppercase letter, number, and symbol';
		} else {
			errors.password = '';
		}
		// Also validate confirm password when password changes
		validateConfirmPasswordField();
	}

	function validateConfirmPasswordField() {
		if (!confirmPassword) {
			errors.confirmPassword = 'Please confirm your password';
		} else if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		} else {
			errors.confirmPassword = '';
		}
	}

	function validateCompanyField() {
		if (!company.trim()) {
			errors.company = 'Company name is required';
		} else {
			errors.company = '';
		}
	}

	function validateTermsAgreement() {
		if (!agreedToTerms || !agreedToPrivacy || !agreedToCookies) {
			errors.terms = 'You must agree to all terms and policies';
		} else {
			errors.terms = '';
		}
	}

	// Process server-side form errors
	$effect(() => {
		if (data?.errors) {
			errors = { ...errors, ...data.errors };
		}

		if (data?.message) {
			toastError($_(data.message));
		}

		// Populate form with returned values on error
		if (data?.firstName) firstName = data.firstName;
		if (data?.lastName) lastName = data.lastName;
		if (data?.email) email = data.email;
		if (data?.company) company = data.company;
		if (data?.agreedToTerms) agreedToTerms = data.agreedToTerms;
		if (data?.agreedToPrivacy) agreedToPrivacy = data.agreedToPrivacy;
		if (data?.agreedToCookies) agreedToCookies = data.agreedToCookies;
	});

	async function handleSubmit(
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement },
		cancel: () => void
	) {
		if (!validateForm()) {
			cancel();
			return;
		}
		const data = new FormData(event.currentTarget);

		try {
			// Manual form submission to the API endpoint
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					firstName,
					lastName,
					email,
					password,
					company
				})
			});

			const result = await response.json();
			if (!response.ok || !result.success) {
				// Show error toast
				toastError(result.error ? $_(result.error) : $_('Registration failed. Please try again.'));
				isSubmitting = false;
				return;
			}

			// Registration successful - check if email confirmation required
			await invalidateAll();
			goto(`/auth/check-email?email=${encodeURIComponent(email)}`);
		} catch (err) {
			console.error('Registration error:', err);
			toastError($_('An unexpected error occurred. Please try again.'));
			isSubmitting = false;
		}
	}
</script>

{#snippet passwordRequirementList({
	value,
	includeMatch
}: {
	value: string;
	includeMatch: boolean;
})}
	{@const status = includeMatch ? null : computePasswordRequirementStatus(value)}
	{@const unmetRequirementLabels = status ? getUnmetRequirementLabels(status) : []}
	<ul class="mt-2 space-y-1 text-xs" role="status" aria-live="polite">
		{#if !includeMatch}
			{#each passwordRequirementEntries as { key, label }}
				{@const satisfied = status ? status[key] : false}
				<li
					class={`flex items-center gap-2 ${
						satisfied ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
					}`}
				>
					<span
						class={`${
							satisfied ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
						} flex h-3.5 w-3.5 items-center justify-center`}
						aria-hidden="true"
					>
						{#if satisfied}
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414L8.75 11.836l6.543-6.543a1 1 0 0 1 1.414 0"
									clip-rule="evenodd"
								/>
							</svg>
						{:else}
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path
									d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m0-2.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0-3.5a1 1 0 0 0 1-1V7a1 1 0 1 0-2 0v4a1 1 0 0 0 1 1"
								/>
							</svg>
						{/if}
					</span>
					<span>{$_(label)}</span>
				</li>
			{/each}
		{/if}

		{#if includeMatch}
			<li
				class={`flex items-center gap-2 ${
					passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
				}`}
			>
				<span
					class={`${
						passwordsMatch
							? 'text-green-600 dark:text-green-400'
							: 'text-gray-400 dark:text-gray-500'
					} flex h-3.5 w-3.5 items-center justify-center`}
					aria-hidden="true"
				>
					{#if passwordsMatch}
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414L8.75 11.836l6.543-6.543a1 1 0 0 1 1.414 0"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m0-2.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0-3.5a1 1 0 0 0 1-1V7a1 1 0 1 0-2 0v4a1 1 0 0 0 1 1"
							/>
						</svg>
					{/if}
				</span>
				<span>
					{#if passwordsMatch}
						{$_('Passwords match')}
					{:else}
						{$_('Passwords must match')}
					{/if}
				</span>
			</li>
		{/if}
	</ul>

	{@const unmetWithMatch = (() => {
		const messages = [];
		const labels =
			!includeMatch && Array.isArray(unmetRequirementLabels) ? unmetRequirementLabels : [];

		for (const label of labels) {
			messages.push($_(label));
		}

		if (includeMatch && !passwordsMatch) {
			messages.push($_('Passwords must match'));
		}

		return messages;
	})()}

	{#if unmetWithMatch.length > 0}
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
			{$_('Still needed')}: {unmetWithMatch.join(', ')}
		</p>
	{/if}
{/snippet}

<svelte:head>
	<title>{$_('Register')} | IoT Dashboard</title>
</svelte:head>

<!-- Professional Background Layer -->
<div class="register-background"></div>

<div
	class="bg-background-light/30 dark:bg-background-dark/30 relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
>
	<div
		class="bg-card-light/95 dark:bg-card-dark/95 w-full max-w-md space-y-8 rounded-xl border-2 border-white/40 p-8 shadow-2xl backdrop-blur-xl dark:border-blue-400/30"
	>
		<div>
			<h2 class="text-text-light dark:text-text-dark mt-6 text-center text-3xl font-extrabold">
				{$_('Create your account')}
			</h2>
			<p class="text-text-light/70 dark:text-text-dark/70 mt-2 text-center text-sm">
				{$_('Or')}
				<a
					href="/auth/login"
					class="text-primary-light dark:text-primary-dark font-medium hover:underline"
				>
					{$_('sign in to your existing account')}
				</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" action="?/register" method="POST" use:enhance={handleSubmit}>
			<div class="space-y-4">
				<!-- First and Last Name -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label
							for="firstName"
							class="text-text-light dark:text-text-dark block text-sm font-medium"
						>
							{$_('First Name')} <span class="text-red-500">*</span>
						</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							bind:value={firstName}
							onblur={validateFirstName}
							oninput={validateFirstName}
							class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.firstName
								? 'border-red-500 focus:border-red-500 focus:ring-red-500'
								: ''}"
							placeholder={$_('John')}
							disabled={isSubmitting}
							required
						/>
						{#if errors.firstName}
							<p class="mt-1 text-xs text-red-500">{$_(errors.firstName)}</p>
						{/if}
					</div>

					<div>
						<label
							for="lastName"
							class="text-text-light dark:text-text-dark block text-sm font-medium"
						>
							{$_('Last Name')} <span class="text-red-500">*</span>
						</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							bind:value={lastName}
							onblur={validateLastName}
							oninput={validateLastName}
							class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.lastName
								? 'border-red-500 focus:border-red-500 focus:ring-red-500'
								: ''}"
							placeholder={$_('Doe')}
							disabled={isSubmitting}
							required
						/>
						{#if errors.lastName}
							<p class="mt-1 text-xs text-red-500">{$_(errors.lastName)}</p>
						{/if}
					</div>
				</div>

				<!-- Email -->
				<div>
					<label for="email" class="text-text-light dark:text-text-dark block text-sm font-medium">
						{$_('Email address')} <span class="text-red-500">*</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={email}
						onblur={validateEmailField}
						oninput={validateEmailField}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.email
							? 'border-red-500 focus:border-red-500 focus:ring-red-500'
							: ''}"
						placeholder={$_('you@example.com')}
						disabled={isSubmitting}
						required
					/>
					{#if errors.email}
						<p class="mt-1 text-xs text-red-500">{$_(errors.email)}</p>
					{/if}
				</div>

				<!-- Password -->
				<div>
					<label
						for="password"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						{$_('Password')} <span class="text-red-500">*</span>
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						bind:value={password}
						onblur={validatePasswordField}
						oninput={validatePasswordField}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.password
							? 'border-red-500 focus:border-red-500 focus:ring-red-500'
							: ''}"
						placeholder={$_('••••••••')}
						disabled={isSubmitting}
						required
						minlength="8"
					/>
					{#if errors.password}
						<p class="mt-1 text-xs text-red-500">{$_(errors.password)}</p>
					{/if}
					{@render passwordRequirementList({ value: password, includeMatch: false })}
				</div>

				<!-- Confirm Password -->
				<div>
					<label
						for="confirmPassword"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						{$_('Confirm Password')} <span class="text-red-500">*</span>
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						bind:value={confirmPassword}
						onblur={validateConfirmPasswordField}
						oninput={validateConfirmPasswordField}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.confirmPassword
							? 'border-red-500 focus:border-red-500 focus:ring-red-500'
							: ''}"
						placeholder={$_('••••••••')}
						disabled={isSubmitting}
						required
					/>
					{#if errors.confirmPassword}
						<p class="mt-1 text-xs text-red-500">{$_(errors.confirmPassword)}</p>
					{/if}
					{@render passwordRequirementList({ value: confirmPassword, includeMatch: true })}
				</div>

				<!-- Company -->
				<div>
					<label
						for="company"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						{$_('Company')} <span class="text-red-500">*</span>
					</label>
					<input
						id="company"
						name="company"
						type="text"
						bind:value={company}
						onblur={validateCompanyField}
						oninput={validateCompanyField}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 {errors.company
							? 'border-red-500 focus:border-red-500 focus:ring-red-500'
							: ''}"
						placeholder={$_('Acme Inc.')}
						disabled={isSubmitting}
						required
					/>
					{#if errors.company}
						<p class="mt-1 text-xs text-red-500">{$_(errors.company)}</p>
					{/if}
				</div>

				<!-- Terms and Policies -->
				<div class="space-y-2">
					<p class="text-text-light dark:text-text-dark text-sm font-semibold">
						{$_('Required Agreements')} <span class="text-red-500">*</span>
					</p>
					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="terms"
								name="terms"
								type="checkbox"
								bind:checked={agreedToTerms}
								onchange={validateTermsAgreement}
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
								required
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="terms" class="text-text-light dark:text-text-dark font-medium">
								{$_('I agree to the')}
								<a
									href="/legal/EULA"
									target="_blank"
									class="text-primary-light dark:text-primary-dark hover:underline"
									>{$_('Terms of Service')}</a
								> <span class="text-red-500">*</span>
							</label>
						</div>
					</div>

					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="privacy"
								name="privacy"
								type="checkbox"
								bind:checked={agreedToPrivacy}
								onchange={validateTermsAgreement}
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
								required
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="privacy" class="text-text-light dark:text-text-dark font-medium">
								{$_('I agree to the')}
								<a
									href="/legal/privacy-policy"
									target="_blank"
									class="text-primary-light dark:text-primary-dark hover:underline"
									>{$_('Privacy Policy')}</a
								> <span class="text-red-500">*</span>
							</label>
						</div>
					</div>

					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="cookies"
								name="cookies"
								type="checkbox"
								bind:checked={agreedToCookies}
								onchange={validateTermsAgreement}
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
								required
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="cookies" class="text-text-light dark:text-text-dark font-medium">
								{$_('I agree to the')}
								<a
									href="/legal/cookie-policy"
									target="_blank"
									class="text-primary-light dark:text-primary-dark hover:underline"
									>{$_('Cookie Policy')}</a
								> <span class="text-red-500">*</span>
							</label>
						</div>
					</div>

					{#if errors.terms}
						<p class="mt-1 text-xs text-red-500">{$_(errors.terms)}</p>
					{/if}

					{#if !agreedToTerms || !agreedToPrivacy || !agreedToCookies}
						<p class="mt-1 text-xs text-orange-600 dark:text-orange-400">
							<strong>{$_('All three agreements must be accepted to register')}</strong>
						</p>
					{/if}
				</div>
			</div>

			<div>
				<Button
					type="submit"
					variant="primary"
					class="bg-primary-light dark:bg-primary-dark hover:bg-primary-light/90 dark:hover:bg-primary-dark/90 focus:ring-primary-light dark:focus:ring-primary-dark relative flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isSubmitting || !isFormValid}
				>
					{isSubmitting ? $_('Registering...') : $_('Register')}
					{#if isSubmitting}
						<Spinner />
					{/if}
				</Button>

				{#if !isFormValid && !isSubmitting}
					<p class="mt-2 text-center text-xs text-orange-600 dark:text-orange-400">
						Please complete all required fields and accept all agreements to register
					</p>
				{/if}
			</div>
		</form>
	</div>
</div>

<style>
	.register-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1;

		/* Rich corporate gradient - matching forgot password */
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 25%, #2563eb 75%, #1d4ed8 100%);

		/* Ensure it's visible */
		opacity: 1;

		/* Professional corporate overlay patterns */
		background-image: 
			/* Corporate highlight orbs */
			radial-gradient(circle at 15% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
			radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.25) 0%, transparent 45%),
			radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.2) 0%, transparent 40%),
			/* Subtle business texture */
				radial-gradient(circle at 25% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 35%),
			radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 30%);

		background-size:
			1000px 1000px,
			800px 800px,
			600px 600px,
			400px 400px,
			500px 500px;

		background-position:
			0 0,
			100px 100px,
			300px 200px,
			500px 300px,
			200px 400px;

		/* Subtle floating animation */
		animation: floatBackground 20s ease-in-out infinite;
	}

	@keyframes floatBackground {
		0%,
		100% {
			transform: translateX(0) translateY(0);
		}
		25% {
			transform: translateX(-20px) translateY(-10px);
		}
		50% {
			transform: translateX(10px) translateY(-20px);
		}
		75% {
			transform: translateX(-10px) translateY(10px);
		}
	}

	/* Dark mode - rich professional dark gradient */
	:global(.dark) .register-background {
		background: linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #1e40af 75%, #1e3a8a 100%);

		background-image: 
			/* Dark mode corporate highlights */
			radial-gradient(circle at 15% 25%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.35) 0%, transparent 45%),
			radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.3) 0%, transparent 40%),
			/* Professional dark texture */
				radial-gradient(circle at 25% 80%, rgba(255, 255, 255, 0.04) 0%, transparent 35%),
			radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 30%);
	}
</style>
