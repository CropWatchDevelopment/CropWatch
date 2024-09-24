<script lang="ts">
	import { notificationStore, type UINotification } from '$lib/stores/notificationStore';
	import { mdiInformation } from '@mdi/js';
	import { Button, Icon, Notification } from 'svelte-ux';

	let notification: UINotification;

	$: notificationStore.subscribe((value) => {
		notification = value;
	});
</script>

<div class="absolute right-6 top-6 z-50">
	<!-- open={notification.open} -->
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
