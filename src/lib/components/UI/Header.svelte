<script lang="ts">
	import { AppBar, Button, Menu, MenuItem, ThemeSelect, Toggle } from 'svelte-ux';
	import AvatarCard from './AvatarCard.svelte';
	import { browser } from '$app/environment';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { mdiBell, mdiBellAlert } from '@mdi/js';
	import { goto } from '$app/navigation';

	let userContext = getUserState();
	let { user } = $derived(userContext);
	let anyAlerts = $derived(userContext.allDevices.some((device) => device.cw_rules.length > 0));

	$effect(() => {
		if (browser) {
			userContext.fetchLocations();
		}
	});
</script>

<AppBar
	class="bg-primary text-primary-content shadow-md [text-shadow:1px_1px_2px_var(--color-primary-700)]"
>
	<div slot="title" class="flex flex-row items-center">
		<img src="/icons/favicon.png" alt="CropWatch Logo" class="mr-2 h-8 w-8" />
		<h1 class="text-lg font-bold">CropWatch</h1>
	</div>
	<div slot="actions" class="flex flex-row">
		<Toggle let:on={open} let:toggle let:toggleOff>
			<Button
				icon={anyAlerts ? mdiBellAlert : mdiBell}
				color={anyAlerts ? 'danger' : 'default'}
				on:click={toggle}
			>
				<Menu {open} on:close={toggleOff}>
					{#each userContext.allDevices as device}
						{#if device.cw_rules.length > 0}
							<MenuItem on:click={() => goto(`/app/location/${device.location_id}/devices/${device.dev_eui}/detail`)}>
								{device.name} has alerts
							</MenuItem>
						{/if}
					{/each}
				</Menu>
			</Button>
		</Toggle>
		<span class="hidden sm:flex">
			<ThemeSelect lightThemes={['light']} darkThemes={['dark']} />
		</span>
		<AvatarCard />
	</div>
</AppBar>
