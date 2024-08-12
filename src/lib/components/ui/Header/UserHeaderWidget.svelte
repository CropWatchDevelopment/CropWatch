<script lang="ts">
	import { browser } from '$app/environment';
	import {
		mdiAccountCircle,
		mdiCloseCircle,
		mdiCog,
		mdiExitRun,
		mdiHelpCircle,
		mdiMagnify,
		mdiReload,
		mdiThemeLightDark,
	} from '@mdi/js';
	import { Avatar, Button, Icon, Menu, MenuItem, TextField, ThemeSwitch, Toggle } from 'svelte-ux';
	import LanguageSelect from './LanguageSelect.svelte';
	import { goto } from '$app/navigation';

	let avatarUrl = browser ? (localStorage.getItem('avatarUrl') || null) : null;
	let searchText: string = '';
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
			<div class="hidden md:flex md:flex-col gap-1 text-center">
				<p>Kevin Cantrell</p>
				<hr class="h-px w-full bg-gray-200" />
				<p class="text-xs text-secondary-100">System Administrator</p>
			</div>
		</div>

		<Menu {open} on:close={toggleOff} explicitClose let:close class="z-50">
			<div class="flex flex-col md:hidden gap-1 text-center">
				<p>Kevin Cantrell</p>
				<hr class="h-px w-1/2 mx-auto bg-gray-200" />
				<p class="text-xs text-secondary-100">System Administrator</p>
			</div>
			<div class="p-2">
				<TextField icon={mdiMagnify} bind:value={searchText} placeholder="Search" class="mb-2" autofocus={{ delay: 50 }}>
					<div slot="append">
						<Button variant="none" icon={mdiCloseCircle} on:click={() => (searchText = '')} />
					</div>
				</TextField>
				<MenuItem on:click={() => location.reload()} icon={mdiReload}>Refresh</MenuItem>
				<MenuItem on:click={() => {close; goto(`/app/general-settings`)}} icon={mdiCog}>General Settings</MenuItem>
				<MenuItem icon={mdiThemeLightDark}>Dark Mode: <ThemeSwitch /></MenuItem>
				<MenuItem on:click={close} icon={mdiHelpCircle}>Help</MenuItem>
				<MenuItem icon={mdiExitRun}>
					<form action="/auth/logout?/logout" method="post">
						<Button type="submit" variant="none">Sign Out</Button>
					</form>
				</MenuItem>
			</div>
		</Menu>
	</Button>
</Toggle>
