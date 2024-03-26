<script lang="ts">
	import type { INotification } from "$lib/interfaces/INotification.interface";
	import { ListItem } from "svelte-ux";

	const notifications: INotification[] = [];
</script>

<div class="m-4">
	<h2>Notifications</h2>

	<ol>
		{#each notifications as notification}
			<ListItem
				title={notification.title}
				subheading={notification.subtitle}
				icon={notification.icon}
				avatar={{ class: 'bg-gray-400 text-white/90' }}
			/>
		{/each}

        {#if notifications.length === 0}
            <h3 class="text-center">All Cought Up!</h3>
        {/if}
	</ol>
</div>
