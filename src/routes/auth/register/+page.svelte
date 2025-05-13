<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';

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
		} else if (password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
			isValid = false;
		}

		// Validate password confirmation
		if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
			isValid = false;
		}

		// Validate company
		if (!company.trim()) {
			errors.company = 'Company name is required';
			isValid = false;
		}

		// Validate terms agreement
		if (!agreedToTerms || !agreedToPrivacy || !agreedToCookies) {
			errors.terms = 'You must agree to all terms and policies';
			isValid = false;
		}

		return isValid;
	}

	// Process server-side form errors
	$effect(() => {
		if (data?.errors) {
			errors = { ...errors, ...data.errors };
		}

		if (data?.message) {
			toastError(data.message);
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
				toastError(result.error || 'Registration failed. Please try again.');
				isSubmitting = false;
				return;
			}

			// Registration successful - check if email confirmation required
			await invalidateAll();
			goto(`/auth/check-email?email=${encodeURIComponent(email)}`);
		} catch (err) {
			console.error('Registration error:', err);
			toastError('An unexpected error occurred. Please try again.');
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Register | IoT Dashboard</title>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="bg-card-light dark:bg-card-dark w-full max-w-md space-y-8 rounded-xl p-8 shadow-md">
		<div>
			<h2 class="text-text-light dark:text-text-dark mt-6 text-center text-3xl font-extrabold">
				Create your account
			</h2>
			<p class="text-text-light/70 dark:text-text-dark/70 mt-2 text-center text-sm">
				Or
				<a
					href="/auth/login"
					class="text-primary-light dark:text-primary-dark font-medium hover:underline"
				>
					sign in to your existing account
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
							First Name
						</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							bind:value={firstName}
							class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
							placeholder="John"
							disabled={isSubmitting}
						/>
						{#if errors.firstName}
							<p class="mt-1 text-xs text-red-500">{errors.firstName}</p>
						{/if}
					</div>

					<div>
						<label
							for="lastName"
							class="text-text-light dark:text-text-dark block text-sm font-medium"
						>
							Last Name
						</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							bind:value={lastName}
							class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
							placeholder="Doe"
							disabled={isSubmitting}
						/>
						{#if errors.lastName}
							<p class="mt-1 text-xs text-red-500">{errors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Email -->
				<div>
					<label for="email" class="text-text-light dark:text-text-dark block text-sm font-medium">
						Email address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={email}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
						placeholder="you@example.com"
						disabled={isSubmitting}
					/>
					{#if errors.email}
						<p class="mt-1 text-xs text-red-500">{errors.email}</p>
					{/if}
				</div>

				<!-- Password -->
				<div>
					<label
						for="password"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						bind:value={password}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
						placeholder="••••••••"
						disabled={isSubmitting}
					/>
					{#if errors.password}
						<p class="mt-1 text-xs text-red-500">{errors.password}</p>
					{/if}
				</div>

				<!-- Confirm Password -->
				<div>
					<label
						for="confirmPassword"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						bind:value={confirmPassword}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
						placeholder="••••••••"
						disabled={isSubmitting}
					/>
					{#if errors.confirmPassword}
						<p class="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
					{/if}
				</div>

				<!-- Company -->
				<div>
					<label
						for="company"
						class="text-text-light dark:text-text-dark block text-sm font-medium"
					>
						Company
					</label>
					<input
						id="company"
						name="company"
						type="text"
						bind:value={company}
						class="text-text-light dark:text-text-dark focus:ring-primary-light dark:focus:ring-primary-dark focus:border-primary-light dark:focus:border-primary-dark relative mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800"
						placeholder="Acme Inc."
						disabled={isSubmitting}
					/>
					{#if errors.company}
						<p class="mt-1 text-xs text-red-500">{errors.company}</p>
					{/if}
				</div>

				<!-- Terms and Policies -->
				<div class="space-y-2">
					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="terms"
								name="terms"
								type="checkbox"
								bind:checked={agreedToTerms}
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="terms" class="text-text-light dark:text-text-dark font-medium">
								I agree to the <a
									href="/terms"
									class="text-primary-light dark:text-primary-dark hover:underline"
									>Terms of Service</a
								>
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
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="privacy" class="text-text-light dark:text-text-dark font-medium">
								I agree to the <a
									href="/privacy"
									class="text-primary-light dark:text-primary-dark hover:underline"
									>Privacy Policy</a
								>
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
								class="focus:ring-primary-light dark:focus:ring-primary-dark text-primary-light dark:text-primary-dark h-4 w-4 rounded border-gray-300 dark:border-gray-700"
								disabled={isSubmitting}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="cookies" class="text-text-light dark:text-text-dark font-medium">
								I agree to the <a
									href="/cookies"
									class="text-primary-light dark:text-primary-dark hover:underline">Cookie Policy</a
								>
							</label>
						</div>
					</div>

					{#if errors.terms}
						<p class="mt-1 text-xs text-red-500">{errors.terms}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					class="group bg-primary-light dark:bg-primary-dark hover:bg-primary-light/90 dark:hover:bg-primary-dark/90 focus:ring-primary-light dark:focus:ring-primary-dark relative flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Registering...' : 'Register'}
				</button>
			</div>
		</form>
	</div>
</div>
