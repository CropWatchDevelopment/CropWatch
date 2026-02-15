<script lang="ts">
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWCopy from '$lib/components/CWCopy.svelte';
	import { goto } from '$app/navigation';
	import RIGHT_ARROW_ICON from '$lib/images/icons/forward.svg';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import BANK_ICON from '$lib/images/icons/bank.svg';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	// Form result type
	interface FormResult {
		success?: boolean;
		error?: string;
		message?: string;
		action?: string;
		avatarUrl?: string;
	}

	let { data, form } = $props<{
		data: {
			profile: {
				username?: string | null;
				full_name?: string | null;
				employer?: string | null;
				avatar_url?: string | null;
				created_at?: string | null;
				last_login?: string | null;
			} | null;
			user: {
				id: string;
				email?: string;
			} | null;
		};
		form: FormResult | null;
	}>();

    let supabase: SupabaseClient = $derived(data.supabase);
	// Form state
	let username = $state(data.profile?.username ?? '');
	let fullName = $state(data.profile?.full_name ?? '');
	let employer = $state(data.profile?.employer ?? '');
	let temperatureUnit = $state('celsius'); // Default, would be stored in profile or user preferences
	let currency = $state('USD'); // Default currency
	let timezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone); // Default to user's system timezone
	let avatarUrl = $state(data.profile?.avatar_url ?? '');

	// Password state
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);

	// UI state
	let isUpdatingProfile = $state(false);
	let isUpdatingPassword = $state(false);
	let isUploadingAvatar = $state(false);
	let avatarInputRef = $state<HTMLInputElement | null>(null);
	let selectedAvatarFile = $state<File | null>(null);
	let avatarPreview = $state<string | null>(null);

	// Derived states
	const passwordsMatch = $derived(newPassword === confirmPassword);
	const isPasswordValid = $derived(newPassword.length >= 8);
	const canUpdatePassword = $derived(isPasswordValid && passwordsMatch && newPassword.length > 0);

	// Temperature unit options
	const temperatureOptions = [
		{ value: 'celsius', label: 'Celsius (°C)' },
		{ value: 'fahrenheit', label: 'Fahrenheit (°F)' },
		{ value: 'kelvin', label: 'Kelvin (K)' }
	];

	// Currency options
	const currencyOptions = [
		{ value: 'USD', label: 'USD ($) - US Dollar' },
		{ value: 'JPY', label: 'JPY (¥) - Japanese Yen' },
		{ value: 'CAD', label: 'CAD (🍼) - Canadian Dollar' }
	];

	// Timezone options (common timezones grouped by region)
	const timezoneOptions = [
		// Americas
		{ value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
		{ value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
		{ value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
		{ value: 'America/Anchorage', label: 'Alaska Time - Anchorage' },
		{ value: 'Pacific/Honolulu', label: 'Hawaii Time - Honolulu' },
		{ value: 'America/Toronto', label: 'Eastern Time - Toronto' },
		{ value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
		{ value: 'America/Mexico_City', label: 'Central Time - Mexico City' },
		{ value: 'America/Sao_Paulo', label: 'Brasília Time - São Paulo' },
		{ value: 'America/Buenos_Aires', label: 'Argentina Time - Buenos Aires' },
		// Europe
		{ value: 'Europe/London', label: 'GMT/BST - London' },
		{ value: 'Europe/Paris', label: 'CET/CEST - Paris' },
		{ value: 'Europe/Berlin', label: 'CET/CEST - Berlin' },
		{ value: 'Europe/Amsterdam', label: 'CET/CEST - Amsterdam' },
		{ value: 'Europe/Rome', label: 'CET/CEST - Rome' },
		{ value: 'Europe/Madrid', label: 'CET/CEST - Madrid' },
		{ value: 'Europe/Zurich', label: 'CET/CEST - Zurich' },
		{ value: 'Europe/Stockholm', label: 'CET/CEST - Stockholm' },
		{ value: 'Europe/Oslo', label: 'CET/CEST - Oslo' },
		{ value: 'Europe/Copenhagen', label: 'CET/CEST - Copenhagen' },
		{ value: 'Europe/Helsinki', label: 'EET/EEST - Helsinki' },
		{ value: 'Europe/Athens', label: 'EET/EEST - Athens' },
		{ value: 'Europe/Moscow', label: 'Moscow Time - Moscow' },
		// Asia & Pacific
		{ value: 'Asia/Dubai', label: 'Gulf Time - Dubai' },
		{ value: 'Asia/Kolkata', label: 'India Time - Mumbai' },
		{ value: 'Asia/Singapore', label: 'Singapore Time - Singapore' },
		{ value: 'Asia/Hong_Kong', label: 'Hong Kong Time - Hong Kong' },
		{ value: 'Asia/Shanghai', label: 'China Time - Shanghai' },
		{ value: 'Asia/Tokyo', label: 'Japan Time - Tokyo' },
		{ value: 'Asia/Seoul', label: 'Korea Time - Seoul' },
		{ value: 'Asia/Bangkok', label: 'Indochina Time - Bangkok' },
		{ value: 'Asia/Jakarta', label: 'Western Indonesia - Jakarta' },
		{ value: 'Australia/Sydney', label: 'AEST/AEDT - Sydney' },
		{ value: 'Australia/Melbourne', label: 'AEST/AEDT - Melbourne' },
		{ value: 'Australia/Perth', label: 'AWST - Perth' },
		{ value: 'Pacific/Auckland', label: 'NZST/NZDT - Auckland' },
		// Africa & Middle East
		{ value: 'Africa/Johannesburg', label: 'South Africa Time - Johannesburg' },
		{ value: 'Africa/Cairo', label: 'Eastern European - Cairo' },
		{ value: 'Africa/Lagos', label: 'West Africa Time - Lagos' },
		// UTC
		{ value: 'UTC', label: 'UTC - Coordinated Universal Time' }
	];

	// Handle avatar file selection
	function handleAvatarSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			selectedAvatarFile = file;
			// Create preview URL
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Clear avatar selection
	function clearAvatarSelection() {
		selectedAvatarFile = null;
		avatarPreview = null;
		if (avatarInputRef) {
			avatarInputRef.value = '';
		}
	}

	// Get initials for avatar fallback
	function getInitials(name: string | null | undefined): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((n) => n.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Format date helper
	function formatDate(dateString: string | null | undefined, includeTime = false): string {
		if (!dateString) return 'Unknown';
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		if (includeTime) {
			options.hour = '2-digit';
			options.minute = '2-digit';
		}
		return new Date(dateString).toLocaleDateString('en-US', options);
	}
</script>

<div class="flex min-h-screen flex-col gap-6 bg-slate-950 p-6 text-slate-100">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<CWBackButton fallback="/" />
			<div>
				<h1 class="text-2xl font-semibold text-white">Account Settings</h1>
				<p class="text-sm text-slate-400">Manage your account preferences and security</p>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div transition:slide class="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-green-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<p class="text-sm text-green-300">{form.message}</p>
			</div>
		</div>
	{/if}

	{#if form?.error && !form?.action}
		<div transition:slide class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="text-sm text-red-300">{form.error}</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left Column - Settings Forms -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<!-- Profile Information Section -->
			<form
				method="POST"
				action="?/updateProfile"
				use:enhance={() => {
					isUpdatingProfile = true;
					return async ({ update }) => {
						await update();
						isUpdatingProfile = false;
					};
				}}
				class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
			>
				<h2 class="text-lg font-semibold text-white">Profile Information</h2>
				<p class="mt-1 text-sm text-slate-400">Update your personal details and preferences</p>

				<div class="mt-6 space-y-5">
					<!-- Email (Read-only) -->
					<div>
						<label for="email" class="mb-1.5 block text-sm font-medium text-slate-300">
							Email Address
						</label>
						<input
							id="email"
							type="email"
							value={data.user?.email ?? ''}
							disabled
							class="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-400"
						/>
						<p class="mt-1.5 text-xs text-slate-400">
							Email cannot be changed. Contact support if you need to update it.
						</p>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<!-- Username -->
						<div>
							<label for="username" class="mb-1.5 block text-sm font-medium text-slate-300">
								Username
							</label>
							<input
								id="username"
								name="username"
								type="text"
								bind:value={username}
								placeholder="e.g., johndoe"
								class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
							/>
						</div>

						<!-- Full Name -->
						<div>
							<label for="full_name" class="mb-1.5 block text-sm font-medium text-slate-300">
								Full Name
							</label>
							<input
								id="full_name"
								name="full_name"
								type="text"
								bind:value={fullName}
								placeholder="e.g., John Doe"
								class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
							/>
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<!-- Employer -->
						<div>
							<label for="employer" class="mb-1.5 block text-sm font-medium text-slate-300">
								Employer / Organization
							</label>
							<input
								id="employer"
								name="employer"
								type="text"
								bind:value={employer}
								placeholder="e.g., CropWatch Inc."
								class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
							/>
						</div>

						<!-- Temperature Unit -->
						<CWSelect
							bind:value={temperatureUnit}
							options={temperatureOptions}
							label="Temperature Unit"
							name="temperature_unit"
							id="temperature_unit"
						/>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<!-- Currency -->
						<CWSelect
							bind:value={currency}
							options={currencyOptions}
							label="Currency"
							name="currency"
							id="currency"
						/>

						<!-- Timezone -->
						<CWSelect
							bind:value={timezone}
							options={timezoneOptions}
							label="Timezone"
							name="timezone"
							id="timezone"
						/>
					</div>

					<div class="flex justify-end pt-2">
						<CWButton variant="primary" type="submit" loading={isUpdatingProfile}>
							<img src={SAVE_ICON} alt="Save" class="h-4 w-4 mr-2" />
							Save Changes
						</CWButton>
					</div>
				</div>
			</form>

			<!-- Password Section -->
			<form
				method="POST"
				action="?/updatePassword"
				use:enhance={() => {
					isUpdatingPassword = true;
					return async ({ update, result }) => {
						await update();
						isUpdatingPassword = false;
						if (result.type === 'success') {
							newPassword = '';
							confirmPassword = '';
						}
					};
				}}
				class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">Change Password</h2>
						<p class="text-sm text-slate-400">Update your account password</p>
					</div>
				</div>

				<div class="mt-6 grid gap-5 sm:grid-cols-2">
					<!-- New Password -->
					<div>
						<label for="new_password" class="mb-1.5 block text-sm font-medium text-slate-300">
							New Password
						</label>
						<div class="relative">
							<input
								id="new_password"
								name="new_password"
								type={showPassword ? 'text' : 'password'}
								bind:value={newPassword}
								placeholder="Enter new password"
								minlength="8"
								class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
							>
								{#if showPassword}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										/>
									</svg>
								{/if}
							</button>
						</div>
						{#if newPassword.length > 0 && !isPasswordValid}
							<p class="mt-1.5 text-xs text-amber-400">
								Password must be at least 8 characters long
							</p>
						{/if}
					</div>

					<!-- Confirm Password -->
					<div>
						<label for="confirm_password" class="mb-1.5 block text-sm font-medium text-slate-300">
							Confirm New Password
						</label>
						<input
							id="confirm_password"
							name="confirm_password"
							type={showPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Confirm new password"
							class="w-full rounded-xl border bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:outline-none focus:ring-2
								{confirmPassword.length > 0 && !passwordsMatch
								? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
								: confirmPassword.length > 0 && passwordsMatch
									? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
									: 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'}"
						/>
						{#if confirmPassword.length > 0 && !passwordsMatch}
							<p class="mt-1.5 text-xs text-red-400">Passwords do not match</p>
						{:else if confirmPassword.length > 0 && passwordsMatch}
							<p class="mt-1.5 flex items-center gap-1 text-xs text-green-400">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
								Passwords match
							</p>
						{/if}
					</div>
				</div>

				{#if form?.error && form?.action === 'password'}
					<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
						<p class="text-sm text-red-400">{form.error}</p>
					</div>
				{/if}

				<div class="mt-6 flex justify-end">
					<CWButton
						variant="primary"
						type="submit"
						loading={isUpdatingPassword}
						disabled={!canUpdatePassword}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
						Update Password
					</CWButton>
				</div>
			</form>

			<!-- Quick Actions -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Quick Actions</h2>
				<p class="mt-1 text-sm text-slate-400">Common account management tasks</p>

				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<a
						href="/account/payments"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-sky-500/20 p-3 text-sky-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-sky-400">Billing & Payments</p>
							<p class="mt-1 text-sm text-slate-400">Manage subscriptions and invoices</p>
						</div>
					</a>

					<button
						type="button"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-emerald-500/20 p-3 text-emerald-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-emerald-400">Notifications</p>
							<p class="mt-1 text-sm text-slate-400">Configure alert preferences</p>
						</div>
					</button>

					<button
						type="button"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-purple-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-purple-500/20 p-3 text-purple-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-purple-400">Two-Factor Auth</p>
							<p class="mt-1 text-sm text-slate-400">Enhanced account security</p>
						</div>
					</button>

					<button
						type="button"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-amber-500/20 p-3 text-amber-400">
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-amber-400">Export Data</p>
							<p class="mt-1 text-sm text-slate-400">Download your account data</p>
						</div>
					</button>
				</div>
			</section>
		</div>

		<!-- Right Column - Profile Picture & Account Info -->
		<div class="flex flex-col gap-6">
			<!-- Profile Picture Section -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Profile Picture</h2>
				<p class="mt-1 text-sm text-slate-400">Personalize your account</p>

				<div class="mt-6 flex flex-col items-center gap-4">
					<!-- Avatar Preview -->
					<div class="relative">
						<svelte:boundary>
							<Avatar
								size="xl"
								avatarUrl={avatarPreview ?? avatarUrl}
								initials={getInitials(data.profile?.full_name ?? data.user?.email)}
								{supabase}
							/>

							{#snippet failed(error, reset)}
								<div class="flex h-32 w-32 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
									<div class="text-center">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										<button onclick={reset} class="mt-1 text-xs text-slate-400 hover:text-slate-200">Retry</button>
									</div>
								</div>
							{/snippet}
						</svelte:boundary>
					</div>

					<!-- Upload Form -->
					<form
						method="POST"
						action="?/uploadAvatar"
						enctype="multipart/form-data"
						use:enhance={() => {
							isUploadingAvatar = true;
							return async ({ update, result }) => {
								await update();
								isUploadingAvatar = false;
								if (result.type === 'success' && result.data?.avatarUrl) {
									avatarUrl = result.data.avatarUrl as string;
									clearAvatarSelection();
								}
							};
						}}
						class="flex w-full flex-col items-center gap-3"
					>
						<input
							bind:this={avatarInputRef}
							type="file"
							name="avatar"
							id="avatar"
							accept="image/jpeg,image/png,image/gif,image/webp"
							onchange={handleAvatarSelect}
							class="hidden"
						/>
						<div class="flex flex-wrap justify-center gap-2">
							<CWButton variant="secondary" type="button" onclick={() => avatarInputRef?.click()}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
									/>
								</svg>
								Choose File
							</CWButton>

							{#if selectedAvatarFile}
								<CWButton variant="primary" type="submit" loading={isUploadingAvatar}>
									Upload
								</CWButton>
								<CWButton variant="ghost" type="button" onclick={clearAvatarSelection}>
									Cancel
								</CWButton>
							{/if}
						</div>
						{#if selectedAvatarFile}
							<p class="text-center text-sm text-slate-400">
								{selectedAvatarFile.name}
							</p>
						{/if}
						<p class="text-center text-xs text-slate-400">JPG, PNG, GIF or WebP. Max 2MB.</p>

						{#if form?.error && form?.action === 'avatar'}
							<p class="text-sm text-red-400">{form.error}</p>
						{/if}
					</form>
				</div>
			</div>

			<!-- Account Information -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Account Details</h2>

				<div class="mt-6 space-y-4">
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Status</span>
						<span
							class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30"
						>
							Active
						</span>
					</div>
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Member Since</span>
						<span class="text-sm font-medium text-white"
							>{formatDate(data.profile?.created_at)}</span
						>
					</div>
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Last Login</span>
						<span class="text-sm font-medium text-white"
							>{formatDate(data.profile?.last_login, true)}</span
						>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-400">User ID</span>
						<span class="font-mono text-xs text-slate-400">
							<CWCopy value={data.user?.id ?? 'Unknown'} /></span
						>
					</div>
				</div>

				<div class="mt-6 border-t border-slate-800 pt-4">
					<h2 class="text-lg font-semibold text-white">Payment Details & Settings</h2>
					<p class="mt-1 text-sm text-slate-400">Manage your billing information</p>
					<CWButton class="mt-4 w-full" variant="primary" onclick={() => goto('/account/payments')}>
						<img src={BANK_ICON} alt=">" class="ml-2 h-4 w-4" />
						Manage Payments
						<img src={RIGHT_ARROW_ICON} alt=">" class="ml-2 h-4 w-4" />
					</CWButton>
				</div>
			</section>

			<!-- Danger Zone -->
			<section class="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
				<p class="mt-1 text-sm text-slate-400">Irreversible actions</p>

				<div class="mt-6 space-y-3">
					<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
						<p class="font-medium text-white">Delete Account</p>
						<p class="mt-1 text-sm text-slate-400">Permanently delete your account and all data</p>
						<div class="mt-3">
							<CWButton variant="danger" disabled size="sm">Delete Account</CWButton>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
