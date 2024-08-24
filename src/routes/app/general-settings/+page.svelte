<script lang="ts">
	import { mdiCog } from '@mdi/js';
	import { Button, Icon, SelectField, TextField } from 'svelte-ux';
	import type { SubmitFunction } from '@sveltejs/kit';
	import SupabaseAvatar from '$lib/components/ui/SupabaseAvatar.svelte';
	import { locale, locales } from 'svelte-i18n';
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
	let timezone: string = profile?.timezone ?? '';

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

	const CLIENT_ID = 'OgvNbMAZkaUJfsdUtSaFlz';
	const REDIRECT_URI = encodeURIComponent(
		'https://app.cropwatch.io/app/lineChat/notifications-callback'
	);
	const STATE = 'aabbcc'; // Generate this dynamically in a real app

	const lineAuthorizeUrl = `https://notify-bot.line.me/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=notify&state=${STATE}`;

	function register() {
		window.location.href = lineAuthorizeUrl;
	}
</script>

<svelte:head>
	<title>CropWatch - General Settings</title>
</svelte:head>

<!-- TITLE and Filter -->
<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiCog} class="h-6 w-6" />
		{$_('generalsettings.title')}
	</h2>
</div>

<div class="divide-y divide-white/5">
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">
				{$_('generalsettings.personalinfo.title')}
			</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('generalsettings.personalinfo.description')}
			</p>
		</div>

		<form class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full flex items-center gap-x-8">
					<SupabaseAvatar
						{supabase}
						bind:url={avatarUrl}
						size={10}
						on:upload={() => {
							profileForm.requestSubmit();
						}}
					/>
				</div>

				<div class="sm:col-span-3">
					<TextField
						label={$_('generalsettings.personalinfo.fullname')}
						name="fullName"
						id="fullName"
						value={form?.fullName ?? fullName}
						autocomplete="full-name"
						labelPlacement="top"
					/>
				</div>

				<div class="col-span-full">
					<TextField
						label={$_('generalsettings.personalinfo.email')}
						id="email"
						name="email"
						type="email"
						value={session.user.email}
						autocomplete="email"
						labelPlacement="top"
					/>
				</div>

				<div class="col-span-full">
					<TextField
						label={$_('generalsettings.personalinfo.username')}
						name="username"
						id="username"
						value={form?.username ?? username}
						autocomplete="username"
						placeholder="janesmith"
						labelPlacement="top"
					/>
				</div>

				<div class="col-span-full">
					<SelectField
						options={[
							{ label: 'Japan Standard Time', value: 'Asia/Tokyo' },
							{ label: 'Central European Time', value: 'Europe/Berlin' },
							{ label: 'Eastern Standard Time', value: 'America/New_York' },
							{ label: 'Pacific Standard Time', value: 'America/Los_Angeles' }
						]}
						label="Timezone"
						name="timezone"
						id="timezone"
						value={form?.timezone ?? 'Asia/Tokyo'}
					/>
				</div>
			</div>

			<div class="mt-8 flex">
				<button
					type="submit"
					class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>{$_('app.save')}</button
				>
			</div>
		</form>
	</div>

	<!-- <div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Units & Notations</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				Set how you would like to see units denoted.
			</p>
		</div>

		<form class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full">
					<SelectField
						options={[
							{ label: 'Celsius', value: 'c' },
							{ label: 'Fahrenheit', value: 'f' }
						]}
						label="Temperature Units"
						name="temperature_units"
						id="temperature_units"
					/>
				</div>

				<div class="col-span-full">
					<SelectField
						options={[
							{ label: 'Meters', value: 'm' },
							{ label: 'Feet', value: 'f' },
							{ label: 'nautical', value: 'n' }
						]}
						label="Length"
						name="temperature_units"
						id="temperature_units"
					/>
				</div>

				<div class="col-span-full">
					<SelectField
						options={[
							{ label: 'Hectares', value: 'h' },
							{ label: 'Acres', value: 'a' }
						]}
						label="Area"
						name="temperature_units"
						id="temperature_units"
					/>
				</div>

				<div class="col-span-full">
					<SelectField
						options={[
							{ label: 'UTC', value: 'u' },
							{ label: 'Local', value: 'l' }
						]}
						label="Time"
						name="time_units"
						id="time_units"
					/>
				</div>
			</div>

			<div class="mt-8 flex">
				<button
					type="submit"
					class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>Save</button
				>
			</div>
		</form>
	</div> -->

	<!-- <div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Change password</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				Update your password associated with your account.
			</p>
		</div>

		<form class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full">
					<label for="current-password" class="block text-sm font-medium leading-6 text-white"
						>Current password</label
					>
					<div class="mt-2">
						<input
							id="current-password"
							name="current_password"
							type="password"
							autocomplete="current-password"
							class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div class="col-span-full">
					<label for="new-password" class="block text-sm font-medium leading-6 text-white"
						>New password</label
					>
					<div class="mt-2">
						<input
							id="new-password"
							name="new_password"
							type="password"
							autocomplete="new-password"
							class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div class="col-span-full">
					<label for="confirm-password" class="block text-sm font-medium leading-6 text-white"
						>Confirm password</label
					>
					<div class="mt-2">
						<input
							id="confirm-password"
							name="confirm_password"
							type="password"
							autocomplete="new-password"
							class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>
			</div>

			<div class="mt-8 flex">
				<button
					type="submit"
					class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>Save</button
				>
			</div>
		</form>
	</div> -->

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">
				{$_('generalsettings.notifications.title')}
			</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('generalsettings.notifications.connectLine')}
			</p>
		</div>

		<Button on:click={register} variant="fill" color="success"
			>{$_('generalsettings.notifications.register')} LINE</Button
		>
	</div>

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">
				{$_('generalsettings.language.title')}
			</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				{$_('generalsettings.notifications.description')}
			</p>
		</div>

		<div class="flex w-full flex-row justify-center align-middle">
			<select bind:value={$locale} class="h-10 border">
				{#each $locales as locale}
					<option value={locale}>{locale}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
