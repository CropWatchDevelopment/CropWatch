<script>
	import { goto } from '$app/navigation';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiCog, mdiHelp, mdiLock, mdiRefresh } from '@mdi/js';
	import { Avatar, Button, Icon, Menu, MenuItem, Toggle } from 'svelte-ux';

	let userContext = getUserState();
	let { user } = $derived(userContext);
</script>

{#if user}
	<Toggle let:on={open} let:toggle let:toggleOff>
		<Button on:click={toggle}>
			<div class="flex flex-row items-center border-l">
				<div class="mr-4 flex items-center">
					{#if user?.user_metadata.avatar_url}
						<img
							class="ml-2 h-7 w-7 rounded-full"
							src={user?.user_metadata.avatar_url}
							alt={user?.email}
						/>
					{:else}
					<Avatar>
						<Icon data={mdiLock} class="text-2xl" />
					</Avatar>
					{/if}
				</div>
				<div class="hidden flex-col sm:flex">
					<div class="border-b p-1">
						<p>{user?.email?.toUpperCase()}</p>
					</div>
					<div>{userContext.profile?.employer}</div>
				</div>
			</div>
			<Menu {open} on:close={toggleOff}>
				<MenuItem icon={mdiRefresh} on:click={() => location.reload()}
					>{nameToJapaneseName('Refresh')}</MenuItem
				>
				<MenuItem icon={mdiCog} on:click={() => (location.href = '/app/app-settings')}
					>{nameToJapaneseName('Settings')}</MenuItem
				>
				<MenuItem icon={mdiHelp} on:click={() => (location.href = 'https://kb.cropwatch.io')}
					>{nameToJapaneseName('Help')}</MenuItem
				>
				<MenuItem
					icon={mdiLock}
					onclick={() => {
						document.location.href = '/auth/logout';
					}}
				>
					{#if user}
						{nameToJapaneseName('Logout')}
					{:else}
						{nameToJapaneseName('Login')}
					{/if}
				</MenuItem>
			</Menu>
		</Button>
	</Toggle>
{:else}
	<Button onclick={() => goto('/auth/login')}>
		<div class="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-600">
			<svg
				class="absolute -left-1 h-12 w-12 text-gray-400"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
				><path
					fill-rule="evenodd"
					d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
					clip-rule="evenodd"
				></path></svg
			>
		</div>
	</Button>
{/if}
