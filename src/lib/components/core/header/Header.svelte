<script lang="ts">
	import {
		AppBar,
		Avatar,
		Button,
		Icon,
		Menu,
		MenuItem,
		ResponsiveMenu,
		Toggle,
		Tooltip
	} from 'svelte-ux';
	import {
		mdiAccount,
		mdiBell,
		mdiBellAlert,
		mdiCheckCircle,
		mdiCog,
		mdiDotsVertical,
		mdiLock
	} from '@mdi/js';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/auth.store';
	import { alertState } from '$lib/stores/alert.store';
	import cropWatchSVG from '$lib/images/cropwatch.svg';

	export let username;

	const logout = async () => {
		$authState?.signOut().then((error) => {
			goto('/auth/login');
		});
	};
</script>

<AppBar class="bg-emerald-700 text-white elevation-10">
	<div slot="title" class="flex">
		<img src={cropWatchSVG} class="mr-3 h-6 sm:h-9" alt="CropWatch Company Icon" />
		<span class="hidden md:inline-block translate-y-1/4">CropWatch&nbsp;</span>
		<span class="translate-y-1/4 hidden md:inline-block">Farming</span>
	</div>

	<div slot="actions" class="flex gap-1 md:gap-3">
		<Tooltip title="Alerts" placement="left" offset={2}>
			<Toggle let:on={open} let:toggle>
				<Button
					on:click={toggle}
					icon={{
						data: $alertState.length === 0 ? mdiBell : mdiBellAlert,
						size: '1.5rem',
						style: $alertState.length === 0 ? 'color:white' : 'color:#ecff06'
					}}
				>
					<Menu {open} on:close={toggle}>
						{#if $alertState.length === 0}
							<MenuItem>
								<Icon data={mdiCheckCircle} style="color:green;" /> No new Alerts
							</MenuItem>
						{/if}
					</Menu>
				</Button>
			</Toggle>
		</Tooltip>

		<Tooltip title="User Management" placement="left" offset={2}>
			<Toggle let:on={open} let:toggle let:toggleOff>
				<Button on:click={toggle}>
					<Avatar class="bg-slate-100 text-emerald-700 font-bold">
						<Icon data={mdiAccount} size="35" />
					</Avatar>
					<ResponsiveMenu {open} on:close={toggleOff}>
						<MenuItem icon={mdiCog} classes={{ root: 'p-4' }} on:click={toggleOff}
							>Settings</MenuItem
						>
						<MenuItem
							icon={mdiLock}
							classes={{ root: 'p-4' }}
							on:click={toggleOff}
							on:click={() => logout()}>Logout</MenuItem
						>
					</ResponsiveMenu>
					<div class="grid grid-col grid-rows-2 mx-3">
						<small>
							<small>{username}</small>
						</small>
						<small>Administrator</small>
					</div>
					<Icon data={mdiDotsVertical} />
				</Button>
			</Toggle>
		</Tooltip>
	</div>
</AppBar>
