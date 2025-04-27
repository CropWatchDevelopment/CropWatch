<script lang="ts">
	import GeneralAppSettings from '$lib/components/UI/GeneralAppSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiCog, mdiCheck, mdiAlertCircle, mdiDisc } from '@mdi/js';
	import { Icon, Tabs, Card, Avatar, Header, Button } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { data } = $props();
	const supabase = $derived(data.supabase);

	let size = $state(10);
	let url: string = $state('')
	let avatarUrl: string | null = $state(null)
	let uploading = $state(false)
	let files: FileList = $state();
	const downloadImage = async (path: string) => {
		try {
			const { data, error } = await supabase.storage.from('avatars').download(path)
			if (error) {
				throw error
			}
			const url = URL.createObjectURL(data)
			avatarUrl = url
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error downloading image: ', error.message)
			}
		}
	}
	const uploadAvatar = async () => {
		try {
			uploading = true
			if (!files || files.length === 0) {
				throw new Error('You must select an image to upload.')
			}
			const file = files[0]
			const fileExt = file.name.split('.').pop()
			const filePath = `${Math.random()}.${fileExt}`
			const { error } = await supabase.storage.from('avatars').upload(filePath, file)
			if (error) {
				throw error
			}
			url = filePath
			// setTimeout(() => {
			// 	dispatch('upload')
			// }, 100)
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message)
			}
		} finally {
			uploading = false
		}
	}

	$effect(() => {
		if (url) downloadImage(url)
	})

	let userContext = getUserState();
	userContext.fetchLocations();

	let options = [
		{ label: 'General', value: 1 },
        { label: 'Notation Settings', value: 2 },
	];

	let value: number = $state(1);

	// Discord integration
	const handleDiscordSignup = () => {
		// Discord OAuth2 URL with your app ID
		const clientId = '1332961064832204893';
		// Include 'identify' scope to get user info and 'bot' scope to add the bot to servers
		const scopes = 'identify bot';
		// Your callback URL must be registered in the Discord developer portal
		const redirectUri = encodeURIComponent(`${window.location.origin}/api/discord/callback`);
		const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=${scopes}&response_type=code&redirect_uri=${redirectUri}`;
		
		// Redirect to Discord authorization page
		window.location.href = discordUrl;
	};
	
	// Handle success/error messages from Discord integration
	let discordStatus = $state({
		message: '',
		type: ''
	});
	
	onMount(() => {
		// Check for status parameters in URL
		const error = page.url.searchParams.get('error');
		const success = page.url.searchParams.get('success');
		
		if (success === 'discord_connected') {
			discordStatus = {
				message: 'Successfully connected to Discord! You will now receive notifications.',
				type: 'success'
			};
			// Clean URL
			goto('/app/app-settings', { replaceState: true });
		} else if (error) {
			const errorMessages = {
				'discord_auth_failed': 'Discord authentication failed. Please try again.',
				'discord_token_exchange_failed': 'Could not complete Discord authentication.',
				'discord_user_fetch_failed': 'Could not retrieve Discord user information.',
				'discord_save_failed': 'Failed to save Discord connection.',
				'discord_authentication_failed': 'An error occurred during Discord authentication.',
				'discord_config_missing': 'Discord integration is not properly configured on the server.'
			};
			
			discordStatus = {
				message: errorMessages[error as keyof typeof errorMessages] || 'An error occurred connecting to Discord.',
				type: 'error'
			};
			// Clean URL
			goto('/app/app-settings', { replaceState: true });
		}
	});
	
	// Check if user is already connected to Discord
	let isConnectedToDiscord = $state(false);
	let discordUsername = $state('');
	
	onMount(async () => {
		try {
			const { data, error } = await supabase
				.from('user_discord_connections')
				.select('discord_username')
				.single();
				
			if (data) {
				isConnectedToDiscord = true;
				discordUsername = data.discord_username;
			}
		} catch (error) {
			console.error('Error checking Discord connection:', error);
		}
	});
</script>

<h1 class="mb-1 flex w-full flex-row">
	<Icon data={mdiCog} class="mr-2 items-center" />
	App wide Settings
</h1>

<Tabs {options} bind:value>
	<svelte:fragment slot="content" let:value>
		{#if value === 1}
			<GeneralAppSettings />
		{:else if value === 2}
			settings 2
		{/if}
	</svelte:fragment>
</Tabs>

<!-- Discord Integration Card -->
<Card class="my-6">
	<Header
		title="Discord Integration"
		subheading="Receive notifications from our Discord bot"
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-indigo-600 text-white p-1" size="lg">
				<Icon data={mdiDisc} size="2x" />
			</Avatar>
		</div>
	</Header>
	
	{#if discordStatus.message}
		<div 
			class="mx-4 mt-4"
		>
			<Icon 
				slot="icon" 
				data={discordStatus.type === 'success' ? mdiCheck : mdiAlertCircle} 
				class="mr-2"
			/>
			{discordStatus.message}
		 </div>
	{/if}
	
	<div class="p-4">
		{#if isConnectedToDiscord}
			<div class="flex items-center mb-4">
				<Icon data={mdiCheck} class="text-green-500 mr-2" />
				<p>Connected as <span class="font-semibold">{discordUsername}</span></p>
			</div>
			<Button 
				on:click={handleDiscordSignup}
				variant="outline"
				class="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
			>
				<Icon data={mdiDisc} class="mr-2" />
				Reconnect Discord Account
			</Button>
		{:else}
			<p class="mb-4">Connect your Discord account to receive notifications and updates from CropWatch.</p>
			<Button 
				on:click={handleDiscordSignup}
				class="bg-indigo-600 hover:bg-indigo-700 text-white"
			>
				<Icon data={mdiDisc} class="mr-2" />
				Connect with Discord
			</Button>
		{/if}
	</div>
</Card>

<div>
	{#if avatarUrl}
		<img
			src={avatarUrl}
			alt={avatarUrl ? 'Avatar' : 'No image'}
			class="avatar image"
			style="height: {size}em; width: {size}em;"
		/>
	{:else}
		<div class="avatar no-image" style="height: {size}em; width: {size}em;"></div>
	{/if}
	<input type="hidden" name="avatarUrl" value={url} />
	<div style="width: {size}em;">
		<label class="button primary block" for="single">
			{uploading ? 'Uploading ...' : 'Upload'}
		</label>
		<input
			style="visibility: hidden; position:absolute;"
			type="file"
			id="single"
			accept="image/*"
			bind:files
			onchange={uploadAvatar}
			disabled={uploading}
		/>
	</div>
</div>