<script lang="ts">
	import '../app.css';
	import { Settings, ThemeInit } from 'svelte-ux';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button, Icon, Notification } from 'svelte-ux';
	import { mdiAlertCircle, mdiInbox, mdiInformation } from '@mdi/js';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { UINotification } from '$lib/stores/notificationStore';
	import { pwaInfo } from 'virtual:pwa-info';
	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);
	$: webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '' 

	let notification: UINotification;

	$: notificationStore.subscribe((value) => {
		notification = value;
	});

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});

	supabase
		.channel('cw_rules')
		.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos' }, (payload) => {
			notificationStore.NotificationTimedOpen({
				title: 'New Alert',
				description: `${payload.new.name} has been triggered`,
				icon: mdiAlertCircle,
				duration: 5000,
				buttonText: 'View'
			});
		})
		.subscribe();
</script>

<svelte:head> 
 	{@html webManifestLink} 
</svelte:head>

<div class="absolute z-50 mt-5">
	<Notification actions="below" closeIcon open={notification.open}>
		<div slot="icon" class="self-start">
			{#if notification.icon}
				<Icon data={notification.icon} class={notification.iconColor} />
			{:else}
				<Icon data={mdiInformation} />
			{/if}
		</div>
		<div slot="title">{notification.title}</div>
		<div slot="description">
			{notification.description}
		</div>
		<div slot="actions">
			<Button color="primary">{notification.buttonText}</Button>
		</div>
	</Notification>
</div>
<slot />

