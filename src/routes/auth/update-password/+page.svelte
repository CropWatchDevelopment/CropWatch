<script lang="ts">
	import { enhance } from '$app/forms';
	import { success } from '$lib/stores/toast.svelte.js';
	import { formValidation } from '$lib/actions/formValidation';

	let { data } = $props();
	let form = $derived(data.form);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let passwordsMatch = $state(true);
	let isStrongPassword = $state(true);

	function validatePassword(password: string): boolean {
		return password.length >= 8;
	}

	function validatePasswords() {
		passwordsMatch = newPassword === confirmPassword;
		isStrongPassword = validatePassword(newPassword);
		return passwordsMatch && isStrongPassword;
	}

	function handleSubmit() {
		return () => {
			loading = true;

			// Client-side validation
			if (!validatePasswords()) {
				loading = false;
				return;
			}

			return async ({ result, update }) => {
				loading = false;
				await update();

				if (result.type === 'success') {
					// Clear the form fields on success
					currentPassword = '';
					newPassword = '';
					confirmPassword = '';
					success('Password updated successfully.');
				}
			};
		};
	}
</script>

<svelte:head>
	<title>Update Password | CropWatch</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div
		class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark rounded-lg p-6 shadow-md"
	>
		<h1 class="mb-6 text-2xl font-bold">Update Password</h1>

		{#if form?.success}
			<div
				class="mb-6 rounded-md bg-green-100 p-4 text-center text-green-700 dark:bg-green-900/30 dark:text-green-400"
			>
				<p>Your password has been successfully updated.</p>
			</div>
		{/if}

		<form method="POST" use:enhance={handleSubmit()} use:formValidation class="form-container">
			<div>
				<label for="newPassword" class="mb-1 block text-sm font-medium">New Password</label>
				<input
					type="password"
					id="newPassword"
					name="newPassword"
					bind:value={newPassword}
					autocomplete="new-password"
					required
					minlength="8"
					placeholder="Enter your new password"
					disabled={loading}
					oninput={() => validatePasswords()}
					class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300
                 bg-white px-3 py-2 focus:border-transparent
                 focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
				/>
				{#if !isStrongPassword && newPassword.length > 0}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">
						Password must be at least 8 characters long
					</p>
				{/if}
			</div>

			<div>
				<label for="confirmPassword" class="mb-1 block text-sm font-medium"
					>Confirm New Password</label
				>
				<input
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					bind:value={confirmPassword}
					autocomplete="new-password"
					required
					placeholder="Confirm your new password"
					disabled={loading}
					oninput={() => validatePasswords()}
					class="text-text-light dark:text-text-dark focus:ring-primary w-full rounded-md border border-gray-300
                 bg-white px-3 py-2 focus:border-transparent
                 focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
				/>
				{#if !passwordsMatch && confirmPassword.length > 0}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">Passwords don't match</p>
				{/if}
			</div>

			{#if form?.error && !form?.success}
				<div
					class="rounded-md bg-red-100 p-3 text-center text-red-700 dark:bg-red-900/30 dark:text-red-400"
				>
					{form.error}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="bg-primary hover:bg-primary-hover w-full rounded px-4 py-2 font-medium text-white transition-colors duration-200 disabled:opacity-50"
					disabled={loading || !passwordsMatch || !isStrongPassword || !newPassword}
				>
					{loading ? 'Updating Password...' : 'Update Password'}
				</button>
			</div>
		</form>
	</div>
</div>
