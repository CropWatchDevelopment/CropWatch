<script lang="ts">
	import { mdiCog } from '@mdi/js';
	import { Button, Icon, SelectField, Switch, TextField } from 'svelte-ux';
	import type { SubmitFunction } from '@sveltejs/kit';
	import SupabaseAvatar from '$lib/components/ui/SupabaseAvatar.svelte';
	import { locale, locales } from 'svelte-i18n';
	import { _ } from 'svelte-i18n';
	import { appStore } from '$lib/stores/app.store.js';

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
			<h2 class="text-surface text-base font-semibold leading-7">
				{$_('generalsettings.personalinfo.title')}
			</h2>
			<p class="text-surface mt-1 text-sm leading-6">
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

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface text-base font-semibold leading-7">
				{$_('generalsettings.notifications.title')}
			</h2>
			<p class="text-surface mt-1 text-sm leading-6">
				{$_('generalsettings.notifications.connectLine')}
			</p>
		</div>

		<Button on:click={register} variant="fill" color="success"
			>{$_('generalsettings.notifications.register')}</Button
		>
	</div>

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface text-base font-semibold leading-7">
				{$_('generalsettings.language.title')}
			</h2>
			<p class="text-surface mt-1 text-sm leading-6">
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

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface text-base font-semibold leading-7">
				{$_('generalsettings.troubleshooting.title')}
			</h2>
			<p class="text-surface mt-1 text-sm leading-6">
				{$_('generalsettings.troubleshooting.description')}
			</p>
		</div>

		<div class="flex w-full flex-row justify-center align-middle">
			<label for="debugToggle" class="flex items-center gap-2 text-sm">
				{$_('generalsettings.troubleshooting.debugMode')}:
				<Switch id="debugToggle" bind:checked={$appStore.debugMode} />
			</label>
		</div>
	</div>
</div>
