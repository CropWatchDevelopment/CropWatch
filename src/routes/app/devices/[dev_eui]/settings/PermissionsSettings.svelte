<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		Button,
		DatePickerField,
		NumberStepper,
		TextField,
		SelectField,
		ListItem,
		Icon,
		ProgressCircle
	} from 'svelte-ux';
	import { mdiAccount, mdiCalendar, mdiPlus, mdiTrashCan } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { permissionNumberToRole } from '$lib/components/ui/utilities/permissionNumberToRole';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';

	let loading: boolean = true;
	let permissionsRequest: Tables<'cw_device_owners'>[] = [];
	const permissionLevelOptions = [
		{ label: 'Administrator', value: '1' },
		{ label: 'User', value: '2' },
		{ label: 'Viewer', value: '3' }
	];

	// Fetch device data when component is mounted
	onMount(async () => {
		permissionsRequest = await (await fetch(`/api/v1/permissions/${$page.params.dev_eui}`)).json();
		loading = false;
	});
</script>

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Device Permissions</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">Setup What users can/Cannot see or do</p>
		</div>

		<form action="?/updateDevicePermission" method="POST" class="md:col-span-2">
			<DarkCard title="Add New User Permission:">
				<div class="flex flex-row gap-2">
					<TextField
						label="User Email to grant permission"
						operators={permissionLevelOptions}
						id="permission"
						name="permission"
						class="w-full"
					/>
					<Button icon={mdiPlus} variant="fill" color="success" />
				</div>
			</DarkCard>

			<DarkCard title="Current Users:">
				<ul>
					{#if loading}
						<ProgressCircle />
					{/if}
					{#each permissionsRequest as permission}
						<ListItem
							title={permission.owner.email}
							subheading={permissionNumberToRole(permission.permission_level)}
						>
							<div slot="avatar">
								<!-- {#if permission.owner.avatar_url}
								<img src={permission.owner.avatar_url} alt="your avatar" />
							{:else} -->
								<Icon data={mdiAccount} />
								<!-- {/if} -->
							</div>
							<div slot="actions">
								<Button icon={mdiTrashCan} variant="fill" color="danger" />
							</div>
						</ListItem>
					{/each}
				</ul>
			</DarkCard>
		</form>
	</div>
</div>
