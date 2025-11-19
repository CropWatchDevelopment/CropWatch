<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import {
		mdiAlert,
		mdiMagnify,
		mdiMonitorDashboard,
		mdiSort,
		mdiSortAscending,
		mdiSortDescending,
		mdiEye,
		mdiCog,
		mdiPlus
	} from '$lib/icons/mdi';
	import type { PageData } from './$types';
	import type { Gateway } from '$lib/models/Gateway';
	import type { DeviceGatewayWithDevice } from '$lib/models/DeviceGateway';
	import ConnectedDevicesList from '$lib/components/gateways/ConnectedDevicesList.svelte';

	const columns = [
		{
			key: 'gateway',
			label: 'Gateway',
			width: 'min-w-[16rem] md:w-80',
			align: 'left',
			sortable: true
		},
		{
			key: 'status',
			label: 'Status',
			width: 'min-w-[7rem] md:w-32',
			align: 'center',
			sortable: true
		},
		{
			key: 'visibility',
			label: 'Visibility',
			width: 'min-w-[8rem] md:w-32',
			align: 'center',
			sortable: true
		},
		{
			key: 'lastUpdated',
			label: 'Last Activity',
			width: 'min-w-[12rem] md:w-48',
			align: 'left',
			sortable: true
		},
		{
			key: 'created',
			label: 'Created',
			width: 'min-w-[10rem] md:w-40',
			align: 'left',
			sortable: true
		},
		{
			key: 'actions',
			label: 'Actions',
			width: 'min-w-[9rem] md:w-48',
			align: 'center',
			sortable: false
		}
	] as const;

	type GatewayColumnKey = (typeof columns)[number]['key'];

	let { data } = $props<{ data: PageData }>();
	const gateways = (data.gateways ?? []) as Gateway[];
	const gatewayDeviceMap = (data.gatewayDeviceMap ?? {}) as Record<
		string,
		DeviceGatewayWithDevice[]
	>;

	let searchTerm = $state('');
	let sortColumn = $state<GatewayColumnKey>('gateway');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const gatewayStats = $derived.by(() => ({
		total: gateways.length,
		online: gateways.filter((gateway) => gateway.is_online).length
	}));

	const filteredGateways = $derived.by(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term) return gateways;

		return gateways.filter((gateway) => {
			const name = gateway.gateway_name?.toLowerCase() ?? '';
			const id = gateway.gateway_id?.toLowerCase() ?? '';
			return name.includes(term) || id.includes(term);
		});
	});

	const tableGateways = $derived.by(() => {
		const list = filteredGateways;
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
	});

	const isSearching = $derived.by(() => Boolean(searchTerm.trim()));

	let expandedGatewayId = $state<string | null>(null);

	function getSortValue(gateway: Gateway, key: GatewayColumnKey): string | number {
		switch (key) {
			case 'gateway':
				return (gateway.gateway_name || gateway.gateway_id || '').toLowerCase();
			case 'status':
				return gateway.is_online ? 1 : 0;
			case 'visibility':
				return gateway.is_public ? 1 : 0;
			case 'lastUpdated':
				return Date.parse(gateway.updated_at ?? gateway.created_at ?? '') || 0;
			case 'created':
				return Date.parse(gateway.created_at) || 0;
			default:
				return 0;
		}
	}

	function handleSort(key: GatewayColumnKey) {
		const targetColumn = columns.find((column) => column.key === key);
		if (!targetColumn || !targetColumn.sortable) {
			return;
		}

		if (sortColumn === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = key;
			sortDirection = 'asc';
		}
	}

	function formatTimestamp(value: string | null): string {
		if (!value) return 'Not available';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
	}

	function formatDate(value: string | null): string {
		if (!value) return 'Not available';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
	}

	function formatVisibility(gateway: Gateway) {
		return gateway.is_public ? 'Public' : 'Private';
	}

	function handleRowAction(gateway: Gateway) {
		toggleConnectedDevices(gateway);
	}

	function openGatewayUsers(gateway: Gateway, event?: MouseEvent) {
		event?.stopPropagation();
		const targetGateway = gateway.gateway_id ?? '';
		const query = targetGateway ? `?gateway=${encodeURIComponent(targetGateway)}` : '';
		goto(`/app/all-gateways/add-user${query}`);
	}

	function handleAddGatewayUser() {
		goto('/app/all-gateways/add-user');
	}

	function toggleConnectedDevices(gateway: Gateway, event?: MouseEvent) {
		event?.stopPropagation();
		const id = gateway.gateway_id;
		if (!id) return;
		expandedGatewayId = expandedGatewayId === id ? null : id;
	}

	function getConnectedDevices(gateway: Gateway): DeviceGatewayWithDevice[] {
		return gatewayDeviceMap[gateway.gateway_id] ?? [];
	}
</script>

<div class="space-y-6 px-4 py-6 sm:px-6">
	<div class="gateways-header">
		<div class="gateways-header__info">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Gateways</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Monitor gateway health, connection status, and visibility settings from a single view.
			</p>
			<div class="gateways-metrics">
				<div class="metric">
					<p class="metric-label">Total</p>
					<p class="metric-value">{gatewayStats.total}</p>
				</div>
				<div class="metric">
					<p class="metric-label">Online</p>
					<p class="metric-value">{gatewayStats.online}</p>
				</div>
			</div>
		</div>
		<div class="gateways-header__actions">
			<div class="search-container">
				<div class="relative w-full">
					<Icon
						class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
						path={mdiMagnify}
						size="20"
					/>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search gateways..."
						class="search-input"
						aria-label="Search gateways"
					/>
				</div>
			</div>
			<button class="gateway-action-button" type="button" onclick={handleAddGatewayUser}>
				Add Gateway User
			</button>
		</div>
	</div>

	{#if tableGateways.length > 0}
		<div class="table-wrapper" aria-live="polite">
			<div class="hidden md:block">
				<div class="table-shell overflow-x-auto">
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
										<button
											type="button"
											onclick={() => handleSort(column.key)}
											class="sort-button"
										>
											<span>{column.label}</span>
											<Icon
												data={sortColumn === column.key
													? sortDirection === 'asc'
														? mdiSortAscending
														: mdiSortDescending
													: mdiSort}
												size="1em"
												class={`sort-icon ${sortColumn === column.key ? 'opacity-100' : 'opacity-60'}`}
											/>
										</button>
									{:else}
										<span class="font-semibold tracking-wide uppercase">{column.label}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					<div class="table-body">
						{#each tableGateways as gateway (gateway.id ?? gateway.gateway_id)}
							<div
								class="table-row--interactive table-row"
								role="button"
								tabindex="0"
								onclick={() => handleRowAction(gateway)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										handleRowAction(gateway);
									}
								}}
							>
								<div class="table-cell min-w-[16rem] md:w-80">
									<div class="flex items-center gap-3">
										<Icon
											data={mdiMonitorDashboard}
											class="text-sky-600 dark:text-sky-300"
											size="1em"
										/>
										<div class="min-w-0">
											<p class="cell-title">{gateway.gateway_name || 'Unnamed Gateway'}</p>
											<p class="cell-muted truncate">ID: {gateway.gateway_id}</p>
										</div>
									</div>
								</div>
								<div class="table-cell min-w-[7rem] justify-center md:w-32">
									<span
										class={`status-pill ${gateway.is_online ? 'status-pill--online' : 'status-pill--offline'}`}
									>
										{gateway.is_online ? 'Online' : 'Offline'}
									</span>
								</div>
								<div class="table-cell min-w-[8rem] justify-center md:w-32">
									<span
										class={`visibility-pill ${
											gateway.is_public ? 'visibility-pill--public' : 'visibility-pill--private'
										}`}
									>
										{formatVisibility(gateway)}
									</span>
								</div>
								<div class="table-cell min-w-[12rem] md:w-48">
									<p class="cell-primary">
										{formatTimestamp(gateway.updated_at ?? gateway.created_at)}
									</p>
									<p class="cell-muted">Updated</p>
								</div>
								<div class="table-cell min-w-[10rem] md:w-40">
									<p class="cell-primary">{formatDate(gateway.created_at)}</p>
									<p class="cell-muted">Created</p>
								</div>
								<div class="table-actions table-cell min-w-[9rem] justify-center gap-2 md:w-48">
									<button
										type="button"
										class="action-button"
										onclick={(event) => {
											event.stopPropagation();
											handleRowAction(gateway);
										}}
									>
										<Icon data={mdiEye} size="0.95em" />
										<span>Connected Devices</span>
									</button>
									<button
										type="button"
										class="action-button action-button--secondary"
										onclick={(event) => openGatewayUsers(gateway, event)}
									>
										<Icon data={mdiPlus} size="0.95em" />
										<span>Add user</span>
									</button>
								</div>
								{#if expandedGatewayId === gateway.gateway_id}
									<div class="table-row--expansion table-row">
										<div class="table-cell--expansion table-cell">
											<ConnectedDevicesList devices={getConnectedDevices(gateway)} />
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="space-y-4 md:hidden">
				{#each tableGateways as gateway (gateway.id ?? gateway.gateway_id)}
					<article class="mobile-card">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="mobile-card__title">{gateway.gateway_name || 'Unnamed Gateway'}</p>
								<p class="mobile-card__subtitle">ID: {gateway.gateway_id}</p>
							</div>
							<span
								class={`status-pill ${gateway.is_online ? 'status-pill--online' : 'status-pill--offline'}`}
							>
								{gateway.is_online ? 'Online' : 'Offline'}
							</span>
						</div>
						<dl class="mobile-card__meta">
							<div>
								<dt>Visibility</dt>
								<dd>{formatVisibility(gateway)}</dd>
							</div>
							<div>
								<dt>Last activity</dt>
								<dd>{formatTimestamp(gateway.updated_at ?? gateway.created_at)}</dd>
							</div>
							<div>
								<dt>Created</dt>
								<dd>{formatDate(gateway.created_at)}</dd>
							</div>
						</dl>
						<div class="mobile-card__actions">
							<button
								type="button"
								class="action-button"
								onclick={(event) => toggleConnectedDevices(gateway, event)}
							>
								<Icon data={mdiEye} size="0.95em" />
								<span>Connected Devices</span>
							</button>
							<button
								type="button"
								class="action-button action-button--secondary"
								onclick={() => openGatewayUsers(gateway)}
							>
								<Icon data={mdiCog} size="0.95em" />
								<span>Users</span>
							</button>
						</div>
						{#if expandedGatewayId === gateway.gateway_id}
							<ConnectedDevicesList devices={getConnectedDevices(gateway)} />
						{/if}
					</article>
				{/each}
			</div>
		</div>
	{:else if isSearching}
		<div class="empty-state">
			<Icon class="empty-state__icon" path={mdiMagnify} size="48" />
			<p class="empty-state__title">No gateways match your search</p>
			<p class="empty-state__body">
				No gateways match "{searchTerm}". Try a different keyword or clear the search field.
			</p>
			<button class="gateway-action-button" type="button" onclick={() => (searchTerm = '')}>
				Clear search
			</button>
		</div>
	{:else}
		<div class="empty-state">
			<Icon class="empty-state__icon" path={mdiAlert} size="48" />
			<p class="empty-state__title">No gateways yet</p>
			<p class="empty-state__body">
				Connect your first gateway to start monitoring health and invite collaborators.
			</p>
			<button class="gateway-action-button" type="button" onclick={handleAddGatewayUser}>
				Add Gateway User
			</button>
		</div>
	{/if}
</div>

<style>
	.gateways-header {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media (min-width: 1024px) {
		.gateways-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
			gap: 2rem;
		}
	}

	.gateways-header__info {
		flex: 1 1 auto;
		min-width: 0;
	}

	.gateways-header__actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	@media (min-width: 768px) {
		.gateways-header__actions {
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			max-width: 28rem;
			margin-left: auto;
		}
	}

	.gateways-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
		margin-top: 1.25rem;
	}

	.metric {
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.04));
		border: 1px solid rgba(59, 130, 246, 0.1);
	}

	.metric-label {
		font-size: 0.85rem;
		color: rgb(107 114 128);
		margin-bottom: 0.2rem;
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: rgb(15 23 42);
	}

	:global(.dark) .metric {
		background: rgba(51, 65, 85, 0.8);
		border-color: rgba(148, 163, 184, 0.2);
	}

	:global(.dark) .metric-value {
		color: white;
	}

	.search-container {
		min-width: 280px;
	}

	@media (max-width: 640px) {
		.search-container {
			min-width: 100%;
		}
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		height: 2.75rem;
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
		box-shadow: 0 0 0 3px rgba(59 130 246, 0.12);
	}

	.search-input::placeholder {
		color: rgb(156 163 175);
	}

	.gateways-header__actions .gateway-action-button {
		height: 2.75rem;
	}

	.gateway-action-button {
		padding: 0 1.25rem;
		border-radius: 0.5rem;
		border: none;
		font-weight: 600;
		color: white;
		background: linear-gradient(135deg, rgb(59 130 246), rgb(37 99 235));
		box-shadow: 0 10px 25px rgba(59, 130, 246, 0.25);
		cursor: pointer;
		transition:
			transform 0.15s ease,
			box-shadow 0.2s ease;
	}

	.gateway-action-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 12px 30px rgba(59, 130, 246, 0.35);
	}

	.gateway-action-button:focus-visible {
		outline: 2px solid rgb(96 165 250);
		outline-offset: 2px;
	}

	.table-wrapper {
		margin-top: 1rem;
	}

	.table-shell {
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

	.table-row--interactive {
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}

	.table-row--interactive:hover {
		background: rgba(59, 130, 246, 0.08);
	}

	.table-row--expansion {
		background: rgb(248 250 252);
	}

	.table-cell--expansion {
		flex: 1;
		padding: 0 1rem 1rem;
	}

	.table-row--interactive:focus-visible {
		outline: 2px solid rgb(59 130 246);
		outline-offset: -2px;
	}

	.table-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		font-size: 0.9rem;
		flex-shrink: 0;
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
		font-size: 0.75rem;
		letter-spacing: 0.05em;
		padding: 0.3rem 0.5rem;
		border-radius: 0.375rem;
		transition: background 0.15s ease;
	}

	.sort-button:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.cell-title {
		font-weight: 600;
		color: rgb(15 23 42);
		margin-bottom: 0.1rem;
	}

	.cell-primary {
		color: rgb(51 65 85);
	}

	.cell-muted {
		font-size: 0.75rem;
		color: rgb(148 163 184);
	}

	.status-pill,
	.visibility-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.7rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border: 1px solid transparent;
	}

	.status-pill--online {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(22 163 74);
		border-color: rgba(34, 197, 94, 0.35);
	}

	.status-pill--offline {
		background: rgba(248, 113, 113, 0.18);
		color: rgb(185 28 28);
		border-color: rgba(248, 113, 113, 0.35);
	}

	.visibility-pill--public {
		background: rgba(14, 165, 233, 0.15);
		color: rgb(14 165 233);
		border-color: rgba(14, 165, 233, 0.3);
	}

	.visibility-pill--private {
		background: rgba(148, 163, 184, 0.15);
		color: rgb(100 116 139);
		border-color: rgba(148, 163, 184, 0.3);
	}

	.table-actions {
		flex-wrap: wrap;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.85rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 600;
		border: 1px solid rgb(37 99 235);
		color: rgb(37 99 235);
		background: rgba(37, 99, 235, 0.08);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.action-button:hover {
		background: rgba(37, 99, 235, 0.15);
	}

	.action-button--secondary {
		border-color: rgb(148 163 184);
		color: rgb(71 85 105);
		background: rgba(148, 163, 184, 0.1);
	}

	.action-button--secondary:hover {
		background: rgba(148, 163, 184, 0.2);
	}

	.mobile-card {
		border: 1px solid rgb(229 231 235);
		border-radius: 1rem;
		background: white;
		padding: 1.25rem;
		box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
	}

	.mobile-card__title {
		font-size: 1rem;
		font-weight: 600;
		color: rgb(15 23 42);
	}

	.mobile-card__subtitle {
		font-size: 0.9rem;
		color: rgb(100 116 139);
		margin-top: 0.2rem;
	}

	.mobile-card__meta {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
		font-size: 0.9rem;
		color: rgb(51 65 85);
	}

	.mobile-card__meta dt {
		font-weight: 600;
		font-size: 0.8rem;
		color: rgb(107 114 128);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mobile-card__meta dd {
		margin-top: 0.15rem;
	}

	.mobile-card__actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.empty-state {
		border: 1px dashed rgb(209 213 219);
		border-radius: 1rem;
		padding: 3rem 1.5rem;
		text-align: center;
		background: rgb(249 250 251);
		color: rgb(75 85 99);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.empty-state__icon {
		color: rgb(148 163 184);
	}

	.empty-state__title {
		font-size: 1.15rem;
		font-weight: 600;
		color: rgb(15 23 42);
	}

	.empty-state__body {
		font-size: 0.95rem;
		color: rgb(100 116 139);
		max-width: 28rem;
	}

	:global(.dark) .search-input {
		background-color: rgb(31 41 55);
		border-color: rgb(55 65 81);
		color: white;
	}

	:global(.dark) .search-input:focus {
		border-color: rgb(147 197 253);
		box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.15);
	}

	:global(.dark) .table-shell,
	:global(.dark) .table-body {
		background: rgb(17 24 39);
		border-color: rgb(55 65 81);
	}

	:global(.dark) .table-head {
		background: linear-gradient(90deg, #1d4ed8, #0ea5e9);
	}

	:global(.dark) .table-body .table-row {
		border-color: rgb(55 65 81);
	}

	:global(.dark) .table-body .table-row:nth-child(odd) {
		background: rgb(31 41 55);
	}

	:global(.dark) .table-row--interactive:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	:global(.dark) .cell-title,
	:global(.dark) .cell-primary {
		color: rgb(226 232 240);
	}

	:global(.dark) .cell-muted {
		color: rgb(148 163 184);
	}

	:global(.dark) .status-pill--online {
		background: rgba(34, 197, 94, 0.25);
		color: rgb(187 247 208);
		border-color: rgba(34, 197, 94, 0.45);
	}

	:global(.dark) .status-pill--offline {
		background: rgba(248, 113, 113, 0.3);
		color: rgb(254 226 226);
		border-color: rgba(248, 113, 113, 0.5);
	}

	:global(.dark) .visibility-pill--public {
		background: rgba(14, 165, 233, 0.25);
		color: rgb(191 219 254);
		border-color: rgba(14, 165, 233, 0.45);
	}

	:global(.dark) .visibility-pill--private {
		background: rgba(148, 163, 184, 0.25);
		color: rgb(226 232 240);
		border-color: rgba(148, 163, 184, 0.5);
	}

	:global(.dark) .action-button {
		border-color: rgba(191, 219, 254, 0.5);
		color: rgb(191 219 254);
		background: rgba(191, 219, 254, 0.12);
	}

	:global(.dark) .action-button:hover {
		background: rgba(191, 219, 254, 0.25);
	}

	:global(.dark) .action-button--secondary {
		border-color: rgba(148, 163, 184, 0.5);
		color: rgb(226 232 240);
		background: rgba(148, 163, 184, 0.2);
	}

	:global(.dark) .mobile-card {
		background: rgba(17, 24, 39, 0.8);
		border-color: rgb(55 65 81);
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
	}

	:global(.dark) .mobile-card__title {
		color: rgb(226 232 240);
	}

	:global(.dark) .mobile-card__subtitle,
	:global(.dark) .mobile-card__meta {
		color: rgb(203 213 225);
	}

	:global(.dark) .mobile-card__meta dt {
		color: rgb(148 163 184);
	}

	:global(.dark) .empty-state {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgb(55 65 81);
		color: rgb(226 232 240);
	}

	:global(.dark) .empty-state__title {
		color: rgb(226 232 240);
	}

	:global(.dark) .empty-state__body {
		color: rgb(148 163 184);
	}
</style>
