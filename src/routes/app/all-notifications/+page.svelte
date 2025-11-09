<script lang="ts">
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import type { Rule } from '$lib/models/Rule';
	import {
		mdiAlert,
		mdiMagnify,
		mdiSort,
		mdiSortAscending,
		mdiSortDescending
	} from '$lib/icons/mdi';

	let { data } = $props();
	const notifications = (data.notifications ?? []) as Rule[];
	let searchTerm = $state('');
	let sortColumn = $state<
		| 'name'
		| 'dev_eui'
		| 'send_using'
		| 'action_recipient'
		| 'trigger_count'
		| 'last_triggered'
		| 'is_triggered'
	>('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const filteredNotifications = $derived(filterNotifications(notifications));
	const tableNotifications = $derived(sortNotifications(filteredNotifications));
	const summaryStats = $derived({
		total: notifications.length,
		active: notifications.filter((item) => item.is_triggered).length,
		totalTriggers: notifications.reduce((sum, item) => sum + (item.trigger_count ?? 0), 0)
	});

	const columns = [
		{ key: 'name', label: 'Notification', width: 'w-72', align: 'left', sortable: true },
		{ key: 'dev_eui', label: 'Device', width: 'w-48', align: 'left', sortable: true },
		{ key: 'send_using', label: 'Channel', width: 'w-40', align: 'left', sortable: true },
		{
			key: 'action_recipient',
			label: 'Recipients',
			width: 'flex-1',
			align: 'left',
			sortable: true
		},
		{ key: 'trigger_count', label: 'Total Calls', width: 'w-32', align: 'right', sortable: true },
		{
			key: 'last_triggered',
			label: 'Last Triggered',
			width: 'w-48',
			align: 'left',
			sortable: true
		},
		{ key: 'is_triggered', label: 'Status', width: 'w-32', align: 'center', sortable: true }
	] as const;

	function filterNotifications(list: Rule[]) {
		if (!searchTerm.trim()) return list;
		const term = searchTerm.toLowerCase();
		return list.filter((notification) => {
			const fields = [
				notification.name,
				notification.dev_eui,
				notification.action_recipient,
				notification.send_using
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			return fields.includes(term);
		});
	}

	function sortNotifications(list: Rule[]) {
		return [...list].sort((a, b) => {
			const valueA = getSortValue(a, sortColumn);
			const valueB = getSortValue(b, sortColumn);

			if (valueA < valueB) {
				return sortDirection === 'asc' ? -1 : 1;
			}

			if (valueA > valueB) {
				return sortDirection === 'asc' ? 1 : -1;
			}

			return 0;
		});
	}

	function getSortValue(notification: Rule, key: (typeof columns)[number]['key']) {
		switch (key) {
			case 'trigger_count':
				return notification.trigger_count ?? 0;
			case 'last_triggered':
				return notification.last_triggered ? new Date(notification.last_triggered).getTime() : 0;
			case 'is_triggered':
				return notification.is_triggered ? 1 : 0;
			default:
				return (notification[key] ?? '').toString().toLowerCase();
		}
	}

	function handleSort(key: (typeof columns)[number]['key']) {
		if (sortColumn === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = key;
			sortDirection = 'asc';
		}
	}

	function formatLastTriggered(timestamp: string | null) {
		if (!timestamp) return 'Never triggered';
		const date = new Date(timestamp);
		return Number.isNaN(date.getTime()) ? 'Never triggered' : date.toLocaleString();
	}

	function formatRecipients(value?: string | null) {
		if (!value) return 'No recipients';
		const recipients = value
			.split(',')
			.map((recipient) => recipient.trim())
			.filter(Boolean);

		return recipients.length ? recipients.join(', ') : 'No recipients';
	}

	function formatChannel(notification: Rule) {
		if (notification.send_using) return notification.send_using;
		if (notification.notifier_type != null) return `Notifier ${notification.notifier_type}`;
		return 'Not specified';
	}

	const formatDeviceLabel = (notification: Rule) => notification.dev_eui || 'All devices';
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Notifications</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Review every alert in a single professional table and monitor performance at a glance.
			</p>
		</div>
		<div class="search-container">
			<div class="relative">
				<Icon
					class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
					path={mdiMagnify}
					size="20"
				/>
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search notifications..."
					class="search-input"
				/>
			</div>
		</div>
	</div>

	<!-- Summary statistics -->
	<div class="stats-grid" aria-label="Notification statistics">
		<div class="stat-card">
			<p class="stat-label">Total notifications</p>
			<p class="stat-value">{summaryStats.total}</p>
		</div>
		<div class="stat-card">
			<p class="stat-label">Active right now</p>
			<p class="stat-value">{summaryStats.active}</p>
		</div>
		<div class="stat-card">
			<p class="stat-label">Total calls</p>
			<p class="stat-value">{summaryStats.totalTriggers}</p>
		</div>
	</div>

	<!-- Notification table -->
	<div class="table-wrapper" aria-live="polite">
		{#if tableNotifications.length}
			<div class="table-shell">
				<div class="table-head">
					<div class="table-row--head table-row">
						{#each columns as column (column.key)}
							<div
								class={`table-cell ${column.width} ${
									column.align === 'center'
										? 'justify-center'
										: column.align === 'right'
											? 'justify-end'
											: 'justify-start'
								}`}
							>
								{#if column.sortable}
									<button type="button" onclick={() => handleSort(column.key)} class="sort-button">
										<span>{column.label}</span>
										<Icon
											path={sortColumn === column.key
												? sortDirection === 'asc'
													? mdiSortAscending
													: mdiSortDescending
												: mdiSort}
											class={`sort-icon ${sortColumn === column.key ? 'opacity-100' : 'opacity-60'}`}
											size="18"
										/>
									</button>
								{:else}
									<span class="font-semibold">{column.label}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="table-body">
					{#each tableNotifications as notification (notification.id)}
						<div class="table-row">
							<div class="table-cell w-72">
								<p class="cell-title">{notification.name || 'Untitled notification'}</p>
							</div>
							<div class="table-cell w-48">
								<p class="cell-primary">
									{#if notification.cw_device}
										<a
											href={`/app/dashboard/location/${notification.cw_device?.location_id ?? ''}/devices/${notification.dev_eui ?? ''}`}
											class="underline hover:text-blue-600"
										>
											{formatDeviceLabel(notification)}
										</a>
									{:else}
										{formatDeviceLabel(notification)}
									{/if}
								</p>
							</div>
							<div class="table-cell w-40">
								<p class="cell-primary">{formatChannel(notification)}</p>
							</div>
							<div class="table-cell flex-1">
								<p class="cell-primary">{formatRecipients(notification.action_recipient)}</p>
							</div>
							<div class="table-cell w-32 justify-end">
								<p class="cell-stat">{notification.trigger_count ?? 0}</p>
							</div>
							<div class="table-cell w-48">
								<p class="cell-primary">{formatLastTriggered(notification.last_triggered)}</p>
							</div>
							<div class="table-cell w-32 justify-center">
								<span
									class={`status-pill ${notification.is_triggered ? 'status-pill--active' : 'status-pill--idle'}`}
								>
									{notification.is_triggered ? 'Active' : 'Idle'}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<Icon class="empty-state__icon" path={mdiAlert} size="48" />
				<p class="empty-state__title">No notifications found</p>
				<p class="empty-state__body">
					{searchTerm
						? 'No notifications match your search. Try a different keyword.'
						: 'Create a rule to start receiving notifications.'}
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.search-container {
		min-width: 280px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.5rem;
		background-color: white;
		color: rgb(17 24 39);
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: rgb(59 130 246);
		box-shadow: 0 0 0 3px rgba(59 130 246, 0.1);
	}

	.search-input::placeholder {
		color: rgb(156 163 175);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		background: var(--cw-surface, rgb(249 250 251));
		border: 1px solid rgb(229 231 235);
	}

	.stat-label {
		font-size: 0.85rem;
		color: rgb(107 114 128);
		margin-bottom: 0.35rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 600;
		color: rgb(17 24 39);
	}

	.table-wrapper {
		margin-top: 1rem;
	}

	.table-shell {
		overflow: hidden;
		border: 1px solid rgb(229 231 235);
		border-radius: 1rem;
		background: white;
		box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
	}

	.table-head {
		background: linear-gradient(90deg, #0f172a, #1f2937);
		color: white;
	}

	.table-body {
		background: white;
	}

	.table-row {
		display: flex;
		align-items: stretch;
		width: 100%;
	}

	.table-row--head {
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	}

	.table-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		font-size: 0.9rem;
	}

	.table-body .table-row:nth-child(odd) {
		background: rgb(249 250 251);
	}

	.table-body .table-row {
		border-bottom: 1px solid rgb(229 231 235);
	}

	.table-body .table-row:last-child {
		border-bottom: none;
	}

	.sort-button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.05em;
		padding: 0.3rem 0.4rem;
		border-radius: 0.375rem;
		transition: background 0.15s ease;
	}

	.sort-button:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.sort-icon {
		color: inherit;
	}

	.cell-title {
		font-weight: 600;
		color: rgb(15 23 42);
	}

	.cell-primary {
		color: rgb(51 65 85);
	}

	.cell-stat {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: rgb(15 23 42);
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		border-radius: 9999px;
		border: 1px solid transparent;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-pill--active {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(22 163 74);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.status-pill--idle {
		background: rgba(148, 163, 184, 0.15);
		color: rgb(100 116 139);
		border-color: rgba(148, 163, 184, 0.3);
	}

	.empty-state {
		border: 1px dashed rgb(209 213 219);
		border-radius: 1rem;
		padding: 3rem 1.5rem;
		text-align: center;
		background: rgb(249 250 251);
		color: rgb(75 85 99);
	}

	.empty-state__icon {
		margin-bottom: 1rem;
		color: rgb(156 163 175);
	}

	.empty-state__title {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.35rem;
	}

	.empty-state__body {
		font-size: 0.95rem;
		color: rgb(107 114 128);
	}

	:global(.dark) .search-input {
		background-color: rgb(31 41 55);
		border-color: rgb(55 65 81);
		color: white;
	}

	:global(.dark) .search-input:focus {
		border-color: rgb(147 197 253);
		box-shadow: 0 0 0 3px rgba(147 197 253, 0.15);
	}

	:global(.dark) .stat-card {
		background: rgb(31 41 55);
		border-color: rgb(55 65 81);
	}

	:global(.dark) .stat-value {
		color: white;
	}

	:global(.dark) .table-shell,
	:global(.dark) .table-body {
		background: rgb(17 24 39);
		border-color: rgb(55 65 81);
	}

	:global(.dark) .table-body .table-row {
		border-color: rgb(55 65 81);
	}

	:global(.dark) .table-body .table-row:nth-child(odd) {
		background: rgb(31 41 55);
	}

	:global(.dark) .cell-title,
	:global(.dark) .cell-primary,
	:global(.dark) .cell-stat {
		color: rgb(226 232 240);
	}

	:global(.dark) .empty-state {
		background: rgba(30, 41, 59, 0.5);
		border-color: rgb(55 65 81);
		color: rgb(209 213 219);
	}
</style>
