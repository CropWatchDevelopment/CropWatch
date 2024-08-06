<script lang="ts">
	import { browser } from '$app/environment';
	import {
		mdiAccount,
		mdiAccountCircle,
		mdiCog,
		mdiExitRun,
		mdiHelpCircle,
		mdiMagnify,
		mdiMoonFirstQuarter,
		mdiReload,
		mdiThemeLightDark,
		mdiWeatherNight
	} from '@mdi/js';
	import { Avatar, Button, Icon, Menu, MenuItem, TextField, ThemeSwitch, Toggle } from 'svelte-ux';

	let avatarUrl = browser ? (localStorage.getItem('avatarUrl') || null) : null;
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button on:click={toggle}>
		<div class="flex flex-row gap-4">
			<div>
				<Avatar>
					{#if avatarUrl}
						<img src={avatarUrl} alt="User Avatar" class="rounded-full" />
					{:else}
						<Icon data={mdiAccountCircle} size="lg" />
					{/if}
				</Avatar>
			</div>
			<div class="flex flex-col gap-1 text-left">
				<p>Kevin Cantrell</p>
				<hr class="h-px w-full bg-gray-200" />
				<p class="text-left text-xs text-secondary-100">System Admin</p>
			</div>
		</div>

		<Menu {open} on:close={toggleOff} explicitClose let:close>
			<div class="p-2">
				<TextField icon={mdiMagnify} placeholder="Search" class="mb-2" autofocus={{ delay: 50 }} />
				<MenuItem on:click={() => location.reload()} icon={mdiReload}>Refresh</MenuItem>
				<MenuItem on:click={close} icon={mdiCog}>Settings</MenuItem>
				<MenuItem icon={mdiThemeLightDark}>Dark Mode: <ThemeSwitch /></MenuItem>
				<MenuItem on:click={close} icon={mdiHelpCircle}>Help</MenuItem>
				<MenuItem on:click={close} icon={mdiExitRun}>Sign Out</MenuItem>
			</div>
		</Menu>
	</Button>
</Toggle>
