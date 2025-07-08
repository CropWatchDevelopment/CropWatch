<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/UI/form/Avatar.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';
	export let data;
	export let form;
	let { session, supabase, profile } = data;
	$: ({ session, supabase, profile } = data);
	let profileForm: HTMLFormElement;
	let loading = false;
	let fullName: string = profile?.full_name ?? '';
	let username: string = profile?.username ?? '';
	let website: string = profile?.website ?? '';
	let avatarUrl: string = profile?.avatar_url ?? '';
	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};
	const handleSignOut: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			update();
		};
	};
</script>

<svelte:head>
	<title>{$_('General Account Settings')}</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="w-full border-b pb-4">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
				⚙️ {$_('General Account Settings')}
			</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				{$_('Settings that affect your entire account, including your profile and preferences.')}
			</p>
		</div>
		<div class="search-container"></div>
	</div>

	<!-- Main Content -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Profile Form -->
		<div class="lg:col-span-2">
			<div class="card p-6">
				<h2 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
					{$_('Profile Information')}
				</h2>

				<form
					method="post"
					action="?/update"
					use:enhance={handleSubmit}
					bind:this={profileForm}
					class="space-y-6"
				>
					<!-- Avatar Section -->
					<div class="flex items-center space-x-6">
						<Avatar
							{supabase}
							bind:url={avatarUrl}
							size={16}
							on:upload={() => {
								profileForm.requestSubmit();
							}}
						/>
						<div>
							<h3 class="text-sm font-medium text-gray-900 dark:text-white">
								{$_('Profile Picture')}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{$_('Click to upload a new profile picture')}
							</p>
						</div>
					</div>

					<!-- Email Field -->
					<div>
						<label
							for="email"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{$_('Email')}
						</label>
						<input
							id="email"
							type="email"
							value={session.user.email}
							disabled
							class="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
						/>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{$_('Your email address cannot be changed')}
						</p>
					</div>

					<!-- Full Name Field -->
					<div>
						<label
							for="fullName"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{$_('Full Name')}
						</label>
						<input
							id="fullName"
							name="fullName"
							type="text"
							value={form?.fullName ?? fullName}
							class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							placeholder={$_('Enter your full name')}
						/>
					</div>

					<!-- Username Field -->
					<div>
						<label
							for="username"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{$_('Username')}
						</label>
						<input
							id="username"
							name="username"
							type="text"
							value={form?.username ?? username}
							class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							placeholder={$_('Enter your username')}
						/>
					</div>

					<!-- Website Field -->
					<div>
						<label
							for="website"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{$_('Website')}
						</label>
						<input
							id="website"
							name="website"
							type="url"
							value={form?.website ?? website}
							class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							placeholder={$_('https://example.com')}
						/>
					</div>

					<!-- Save Button -->
					<div class="flex justify-end">
						<button
							type="submit"
							disabled={loading}
							class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
						>
							{loading ? $_('Loading...') : $_('Update')}
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Account Actions Sidebar -->
		<div class="lg:col-span-1">
			<div class="card p-6">
				<h2 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
					{$_('Account Actions')}
				</h2>

				<div class="space-y-4">
					<!-- Sign Out Form -->
					<form method="post" action="?/signout" use:enhance={handleSignOut}>
						<button
							type="submit"
							disabled={loading}
							class="w-full rounded-md bg-red-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-400"
						>
							{loading ? $_('Loading...') : $_('logout')}
						</button>
					</form>

					<!-- Additional actions can be added here -->
					<div class="text-sm text-gray-500 dark:text-gray-400">
						{$_('Need help with your account?')}
						<a
							href="/help"
							class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
						>
							{$_('Contact support')}
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
