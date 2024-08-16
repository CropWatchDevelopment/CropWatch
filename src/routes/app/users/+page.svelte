<script lang="ts">
	import { goto } from '$app/navigation';
	import { mdiAccount, mdiDevices, mdiEye } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, ExpansionPanel, ListItem } from 'svelte-ux';

	let users: any[] = [];

	onMount(async () => {
		const usersPromise = await fetch('/api/v1/users');
		users = await usersPromise.json();
	});
</script>

<h1>All Users({users.length}):</h1>

<ul>
	{#each users as user}
		{#if user.email}
			<ExpansionPanel>
				<ListItem
					slot="trigger"
					title="{user.email}"
					subheading={user.devices.length + ' devices'}
					icon={mdiAccount}
					avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
					class="flex-1"
					noShadow
				/>
				<div>
					{#each user.devices as deviceOwner}
						{#if deviceOwner}
							<ListItem title={deviceOwner.name} icon={mdiDevices}>
								<div slot="actions">
									<Button
										icon={mdiEye}
										variant="fill"
										color="info"
										on:click={() => goto(`/app/devices/${deviceOwner.dev_eui}/data`)}
									/>
								</div>
							</ListItem>
						{/if}
					{/each}
				</div>
			</ExpansionPanel>
		{/if}
	{/each}
</ul>
