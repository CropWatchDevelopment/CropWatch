<script lang="ts">
	import { page } from '$app/state';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwInput,
		CwSeparator
	} from '@cropwatchdevelopment/cwui';

	let deviceName = $state(`Device ${page.params.dev_eui?.toUpperCase() ?? 'UNKNOWN'}`);
	let deviceGroup = $state('north-greenhouse');

	const groupOptions = [
		{ label: 'North Greenhouse', value: 'north-greenhouse' },
		{ label: 'South Greenhouse', value: 'south-greenhouse' },
		{ label: 'Trial Zone', value: 'trial-zone' },
		{ label: 'Unassigned', value: 'unassigned' }
	];

	let permissionRows = $state([
		{
			id: 'u-1',
			name: 'Mina Patel',
			email: 'mina.patel@cropwatch.io',
			permission: 'manager',
			status: 'active'
		},
		{
			id: 'u-2',
			name: 'Leo Kim',
			email: 'leo.kim@cropwatch.io',
			permission: 'operator',
			status: 'active'
		},
		{
			id: 'u-3',
			name: 'Ava Reed',
			email: 'ava.reed@cropwatch.io',
			permission: 'viewer',
			status: 'invited'
		}
	]);

	const permissionOptions = [
		{ label: 'Viewer', value: 'viewer' },
		{ label: 'Operator', value: 'operator' },
		{ label: 'Manager', value: 'manager' }
	];

	const deviceStats = [
		{ label: 'Installed at', value: 'May 18, 2024' },
		{ label: 'Warranty', value: 'Valid until May 18, 2027' },
		{ label: 'Battery last replaced at', value: 'January 9, 2026' }
	];

	const sensors = [
		{ id: 'a', label: 'Sensor A serial', serial: 'A-42-19-88', certificateAvailable: true },
		{ id: 'b', label: 'Sensor B serial', serial: 'B-11-73-05', certificateAvailable: false }
	];
</script>

<svelte:head>
	<title>Device Settings | {page.params.dev_eui?.toUpperCase() ?? 'UNKNOWN'} | CropWatch</title>
</svelte:head>

<div class="settings-page">
	<CwCard
		title="Device Settings"
		subtitle="Update device name and group assignment"
		elevated
	>
		<div class="panel-grid">
			<CwInput label="Device Name" bind:value={deviceName} />
			<CwDropdown label="Device Group" options={groupOptions} bind:value={deviceGroup} />
		</div>

		<div class="panel-actions">
			<CwChip label={`DevEUI ${page.params.dev_eui?.toUpperCase() ?? 'UNKNOWN'}`} tone="info" variant="soft" />
			<CwButton type="button" variant="primary">Update Device</CwButton>
		</div>
	</CwCard>

	<CwCard
		title="User Permissions"
		subtitle="Update only. Add and delete actions are intentionally omitted."
		elevated
	>
		<div class="permissions-tag">
			<CwChip label="Update Only" tone="warning" variant="soft" />
		</div>

		<div class="permission-list">
			{#each permissionRows as member, index (member.id)}
				<div class="permission-row">
					<div class="permission-user">
						<CwInput label="User" value={member.name} disabled />
						<CwInput label="Email" value={member.email} disabled />
					</div>

					<div class="permission-edit">
						<CwDropdown label="Permission" options={permissionOptions} bind:value={member.permission} />
						<CwChip
							label={member.status === 'active' ? 'Active' : 'Invited'}
							tone={member.status === 'active' ? 'success' : 'secondary'}
							variant="soft"
						/>
						<CwButton type="button" variant="primary">Update Permission</CwButton>
					</div>
				</div>

				{#if index < permissionRows.length - 1}
					<CwSeparator spacing="0" />
				{/if}
			{/each}
		</div>
	</CwCard>

	<CwCard
		title="Device Stats"
		subtitle="Installation details, serials, certificates, and billing seat"
		elevated
	>
		<div class="stats-list">
			{#each deviceStats as stat, index (stat.label)}
				<div class="stats-row">
					<p class="stats-label">{stat.label}</p>
					<p class="stats-value">{stat.value}</p>
				</div>
				{#if index < deviceStats.length - 1}
					<CwSeparator spacing="0" />
				{/if}
			{/each}
		</div>

		<CwSeparator spacing="0" />

		<div class="stats-list">
			{#each sensors as sensor (sensor.id)}
				<div class="stats-row sensor-row">
					<div>
						<p class="stats-label">{sensor.label}</p>
						<p class="stats-value">{sensor.serial}</p>
					</div>
					<div class="stats-actions">
						{#if sensor.certificateAvailable}
							<CwButton type="button" size="sm" variant="secondary">Download Certificate</CwButton>
						{:else}
							<CwChip label="Certificate Unavailable" tone="secondary" variant="outline" />
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<CwSeparator spacing="0" />

		<div class="stats-row seat-row">
			<div>
				<p class="stats-label">Assigned seat</p>
				<p class="stats-value">Seat S-0142</p>
			</div>
			<form action="/account/billing" method="GET">
				<CwButton type="submit" size="sm" variant="info">Open Billing</CwButton>
			</form>
		</div>
	</CwCard>
</div>

<style>
	.settings-page {
		display: grid;
		gap: 1rem;
		padding: 0.75rem;
	}

	.panel-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.75rem;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.permissions-tag {
		margin-bottom: 0.75rem;
	}

	.permission-list {
		display: grid;
		gap: 0.75rem;
	}

	.permission-row {
		display: grid;
		grid-template-columns: 2fr 1.6fr;
		gap: 0.75rem;
	}

	.permission-user {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.permission-edit {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: end;
		gap: 0.5rem;
	}

	.stats-list {
		display: grid;
		gap: 0.625rem;
		padding: 0.25rem 0;
	}

	.stats-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.stats-label {
		margin: 0;
		font-size: 0.875rem;
		color: var(--cw-text-muted);
	}

	.stats-value {
		margin: 0;
		font-size: 0.95rem;
		color: var(--cw-text-primary);
		font-weight: 600;
	}

	.stats-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 1024px) {
		.panel-grid,
		.permission-user,
		.permission-row {
			grid-template-columns: 1fr;
		}

		.permission-edit {
			grid-template-columns: 1fr;
			align-items: stretch;
		}
	}
</style>
