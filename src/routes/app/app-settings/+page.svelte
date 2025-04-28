<script lang="ts">
	import GeneralAppSettings from '$lib/components/UI/GeneralAppSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiCog, mdiCheck, mdiAlertCircle, mdiDisc, mdiAccount, mdiThemeLightDark, mdiBell, mdiWeb } from '@mdi/js';
	import { Icon, Tabs, Card, Avatar, Header, Button, Checkbox, Toggle } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { message, superForm } from 'sveltekit-superforms/client';

	let { data } = $props();
	const supabase = $derived(data.supabase);
	const defaultFormData = {
		username: '',
		full_name: '',
		employer: '',
		website: '',
		avatar_url: '',
		discord_username: '',
		measurement_system: 'metric',
		color_theme: 'system',
		notification_preferences: {
			email: true,
			push: true,
			discord: false
		}
	};
	
	const { form, enhance, message: formMessage } = superForm(data.form ?? defaultFormData, {
		resetForm: false,
		taintedMessage: null,
		dataType: 'json'
	});

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
			form.avatar_url = filePath;
			// Download immediately to show the user their uploaded avatar
			await downloadImage(filePath);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message)
			}
		} finally {
			uploading = false
		}
	}

	$effect(() => {
		if (data.profile?.avatar_url) {
			downloadImage(data.profile.avatar_url);
		}
	})

	let userContext = getUserState();
	userContext.fetchLocations();

	let options = [
		{ label: 'General', value: 1 },
        { label: 'Profile Settings', value: 2 },
        { label: 'Notation Settings', value: 3 },
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
			<div class="space-y-8 py-4">
				{#if $formMessage}
					<div class={`p-4 rounded-md ${$formMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
						<div class="flex">
							<Icon data={$formMessage.type === 'success' ? mdiCheck : mdiAlertCircle} class="mr-2" />
							<p>{$formMessage.text}</p>
						</div>
					</div>
				{/if}
				
				<form method="POST" action="?/updateProfile" use:enhance>
					<Card class="mb-6">
						<Header title="Profile Information" subheading="Manage your personal information" slot="header">
							<div slot="avatar">
								<Avatar class="bg-blue-600 text-white p-1" size="lg">
									<Icon data={mdiAccount} size="2x" />
								</Avatar>
							</div>
						</Header>
						
						<div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- Username -->
							<div class="form-control">
								<label for="username" class="form-label">Username</label>
								<input 
									type="text" 
									id="username" 
									name="username" 
									bind:value={$form.username}
									class="input input-bordered w-full"
								/>
								{#if $form.errors?.username}
									<span class="text-sm text-red-600">{$form.errors.username}</span>
								{/if}
							</div>
							
							<!-- Full Name -->
							<div class="form-control">
								<label for="full_name" class="form-label">Full Name</label>
								<input 
									type="text" 
									id="full_name" 
									name="full_name" 
									bind:value={$form.full_name}
									class="input input-bordered w-full"
								/>
								{#if $form.errors?.full_name}
									<span class="text-sm text-red-600">{$form.errors.full_name}</span>
								{/if}
							</div>
							
							<!-- Employer -->
							<div class="form-control">
								<label for="employer" class="form-label">Employer</label>
								<input 
									type="text" 
									id="employer" 
									name="employer" 
									bind:value={$form.employer}
									class="input input-bordered w-full"
								/>
								{#if $form.errors?.employer}
									<span class="text-sm text-red-600">{$form.errors.employer}</span>
								{/if}
							</div>
							
							<!-- Website -->
							<div class="form-control">
								<label for="website" class="form-label">Website</label>
								<div class="flex items-center">
									<Icon data={mdiWeb} class="mr-2 text-gray-400" />
									<input 
										type="url" 
										id="website" 
										name="website" 
										bind:value={$form.website}
										placeholder="https://yourwebsite.com" 
										class="input input-bordered w-full"
									/>
								</div>
								{#if $form.errors?.website}
									<span class="text-sm text-red-600">{$form.errors.website}</span>
								{/if}
							</div>
							
							<!-- Avatar Upload -->
							<div class="form-control col-span-2">
								<label for="avatar" class="form-label">Profile Picture</label>
								<div class="flex items-center space-x-4">
									{#if avatarUrl}
										<img
											src={avatarUrl}
											alt="Avatar"
											class="rounded-full object-cover"
											style="height: {size}em; width: {size}em;"
										/>
									{:else}
										<div class="avatar bg-gray-200 flex items-center justify-center rounded-full" style="height: {size}em; width: {size}em;">
											<Icon data={mdiAccount} size="3x" class="text-gray-400" />
										</div>
									{/if}
									<input type="hidden" id="avatar" name="avatar_url" bind:value={$form.avatar_url} />
									<div>
										<label class="btn btn-primary" for="single">
											{uploading ? 'Uploading...' : 'Upload Image'}
										</label>
										<input
											style="visibility: hidden; position:absolute;"
											type="file"
											id="single"
											accept="image/*"
											bind:files
											on:change={(e) => uploadAvatar()}
											disabled={uploading}
										/>
										<p class="text-sm text-gray-500 mt-1">Recommended size: 200x200px</p>
									</div>
								</div>
							</div>
						</div>
					</Card>
					
					<!-- Display Preferences -->
					<Card class="mb-6">
						<Header title="Display Preferences" subheading="Customize your viewing experience" slot="header">
							<div slot="avatar">
								<Avatar class="bg-purple-600 text-white p-1" size="lg">
									<Icon data={mdiThemeLightDark} size="2x" />
								</Avatar>
							</div>
						</Header>
						
						<div class="p-4 space-y-6">
							<!-- Theme Selection -->
							<div class="form-control">
								<label id="theme-label" class="form-label">Theme</label>
								<div class="flex space-x-4">
									<label class="flex items-center">
										<input type="radio" name="color_theme" value="light" bind:group={$form.color_theme} class="radio mr-2"/>
										Light
									</label>
									<label class="flex items-center">
										<input type="radio" name="color_theme" value="dark" bind:group={$form.color_theme} class="radio mr-2"/>
										Dark
									</label>
									<label class="flex items-center">
										<input type="radio" name="color_theme" value="system" bind:group={$form.color_theme} class="radio mr-2"/>
										System
									</label>
								</div>
							</div>
							
							<!-- Measurement System -->
							<div class="form-control">
								<label id="measurement-label" class="form-label">Measurement System</label>
								<div class="flex space-x-4">
									<label class="flex items-center">
										<input type="radio" name="measurement_system" value="metric" bind:group={$form.measurement_system} class="radio mr-2"/>
										Metric (Celsius, kg, km)
									</label>
									<label class="flex items-center">
										<input type="radio" name="measurement_system" value="imperial" bind:group={$form.measurement_system} class="radio mr-2"/>
										Imperial (Fahrenheit, lb, mi)
									</label>
								</div>
							</div>
						</div>
					</Card>
					
					<!-- Notification Settings -->
					<Card class="mb-6">
						<Header title="Notification Preferences" subheading="Manage how you receive updates" slot="header">
							<div slot="avatar">
								<Avatar class="bg-yellow-600 text-white p-1" size="lg">
									<Icon data={mdiBell} size="2x" />
								</Avatar>
							</div>
						</Header>
						
						<div class="p-4 space-y-4">
							<div class="form-control">
								<label class="flex items-center space-x-2" for="email_notifications">
									<input 
										type="checkbox" 
										id="email_notifications"
										name="notification_preferences.email" 
										bind:checked={$form.notification_preferences.email} 
										class="checkbox"
									/>
									<span>Email Notifications</span>
								</label>
								<p class="text-sm text-gray-500 mt-1 ml-7">Receive updates about your sensors, alerts, and account</p>
							</div>
							
							<div class="form-control">
								<label class="flex items-center space-x-2" for="push_notifications">
									<input 
										type="checkbox" 
										id="push_notifications"
										name="notification_preferences.push" 
										bind:checked={$form.notification_preferences.push} 
										class="checkbox"
									/>
									<span>Push Notifications</span>
								</label>
								<p class="text-sm text-gray-500 mt-1 ml-7">Get real-time alerts directly in your browser</p>
							</div>
							
							<div class="form-control">
								<label class="flex items-center space-x-2" for="discord_notifications">
									<input 
										type="checkbox" 
										id="discord_notifications"
										name="notification_preferences.discord" 
										bind:checked={$form.notification_preferences.discord} 
										class="checkbox"
									/>
									<span>Discord Notifications</span>
								</label>
								<p class="text-sm text-gray-500 mt-1 ml-7">Receive alerts through Discord (requires connection below)</p>
							</div>
						</div>
					</Card>
					
					<div class="flex justify-end">
						<Button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white">
							Save Profile Settings
						</Button>
					</div>
				</form>
			</div>
		{:else if value === 3}
			<div class="py-4">
				<p>Notation settings go here</p>
			</div>
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