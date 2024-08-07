<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button, Icon, Notification } from 'svelte-ux';
	import { mdiInbox, mdiInformation } from '@mdi/js';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { UINotification } from '$lib/stores/notificationStore';
	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);

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
</script>

<slot />

<div class="absolute z-50 mt-5 w-[400px]">
	<Notification actions="below" closeIcon open={notification.open}>
		<div slot="icon" class="self-start">
			{#if notification.icon}
				<Icon data={notification.icon} />
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
