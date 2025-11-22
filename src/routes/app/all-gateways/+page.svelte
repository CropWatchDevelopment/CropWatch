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
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';

	const columns = [
		{
			key: 'gateway',
			label: 'Gateway',
			width: 'flex-1 min-w-[16rem]',
			align: 'left',
			sortable: true
		},
		{
			key: 'status',
			label: 'Status',
			width: 'w-32 shrink-0',
			align: 'center',
			sortable: true
		},
		{
			key: 'visibility',
			label: 'Visibility',
			width: 'w-32 shrink-0',
			align: 'center',
			sortable: true
		},
		{
			key: 'lastUpdated',
			label: 'Last Activity',
			width: 'w-48 shrink-0',
			align: 'left',
			sortable: true
		},
		{
			key: 'created',
			label: 'Created',
			width: 'w-40 shrink-0',
			align: 'left',
			sortable: true
		},
		{
			key: 'actions',
			label: 'Actions',
			width: 'w-48 shrink-0',
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

	let selectedGateway = $state<Gateway | null>(null);
	let showDevicesDialog = $state(false);

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
		selectedGateway = gateway;
		showDevicesDialog = true;
	}

	function getConnectedDevices(gateway: Gateway): DeviceGatewayWithDevice[] {
		return gatewayDeviceMap[gateway.gateway_id] ?? [];
	}
</script>

<div class="space-y-6 px-4 py-6 sm:px-6">
	<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
		<div class="min-w-0 flex-auto">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Gateways</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Monitor gateway health, connection status, and visibility settings from a single view.
			</p>
			<div class="mt-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
				<div
					class="rounded-xl border border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-blue-600/5 p-3 dark:border-slate-400/20 dark:bg-slate-800/80"
				>
					<p class="mb-1 text-sm text-gray-500">Total</p>
					<p class="text-2xl font-bold text-slate-900 dark:text-white">{gatewayStats.total}</p>
				</div>
				<div
					class="rounded-xl border border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-blue-600/5 p-3 dark:border-slate-400/20 dark:bg-slate-800/80"
				>
					<p class="mb-1 text-sm text-gray-500">Online</p>
					<p class="text-2xl font-bold text-slate-900 dark:text-white">{gatewayStats.online}</p>
				</div>
			</div>
		</div>
		<div
			class="flex w-full flex-col gap-3 md:ml-auto md:max-w-md md:flex-row md:items-center md:justify-end"
		>
			<div class="min-w-[280px] max-sm:min-w-full">
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
						class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-10 text-sm text-gray-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-300"
						aria-label="Search gateways"
					/>
				</div>
			</div>
			<button
				class="h-11 rounded-lg border-none bg-gradient-to-br from-blue-500 to-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-px hover:shadow-blue-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
				type="button"
				onclick={handleAddGatewayUser}
			>
				Add Gateway User
			</button>
		</div>
	</div>

	{#if tableGateways.length > 0}
		<div class="mt-4" aria-live="polite">
			<div class="hidden md:block">
				<div
					class="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
				>
					<div
						class="bg-gradient-to-r from-slate-900 to-gray-800 text-white dark:from-blue-700 dark:to-sky-500"
					>
						<div class="flex w-full items-stretch border-b border-white/15">
							{#each columns as column (column.key)}
								<div
									class={`flex items-center gap-2 px-4 py-3.5 text-sm ${column.width} ${
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
											class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-white/15"
										>
											<span>{column.label}</span>
											<Icon
												data={sortColumn === column.key
													? sortDirection === 'asc'
														? mdiSortAscending
														: mdiSortDescending
													: mdiSort}
												size="1em"
												class={`transition-opacity ${sortColumn === column.key ? 'opacity-100' : 'opacity-60'}`}
											/>
										</button>
									{:else}
										<span class="font-semibold tracking-wide uppercase">{column.label}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					<div class="bg-white dark:bg-gray-900">
						{#each tableGateways as gateway (gateway.id ?? gateway.gateway_id)}
							<div
								class="flex w-full cursor-pointer items-stretch border-b border-gray-200 transition-all last:border-b-0 hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 dark:border-gray-700 dark:odd:bg-gray-800 dark:hover:bg-blue-500/20"
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
								<div class="flex min-w-[16rem] flex-1 items-center gap-2 px-4 py-3.5 text-sm">
									<div class="flex items-center gap-3">
										<Icon
											data={mdiMonitorDashboard}
											class="text-sky-600 dark:text-sky-300"
											size="1em"
										/>
										<div class="min-w-0">
											<p class="mb-0.5 font-semibold text-slate-900 dark:text-slate-200">
												{gateway.gateway_name || 'Unnamed Gateway'}
											</p>
											<p class="truncate text-xs text-slate-400 dark:text-slate-400">
												ID: {gateway.gateway_id}
											</p>
										</div>
									</div>
								</div>
								<div
									class="flex w-32 shrink-0 items-center justify-center gap-2 px-4 py-3.5 text-sm"
								>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
											gateway.is_online
												? 'border-green-500/35 bg-green-500/15 text-green-600 dark:border-green-500/45 dark:bg-green-500/25 dark:text-green-200'
												: 'border-red-500/35 bg-red-500/18 text-red-700 dark:border-red-500/50 dark:bg-red-500/30 dark:text-red-100'
										}`}
									>
										{gateway.is_online ? 'Online' : 'Offline'}
									</span>
								</div>
								<div
									class="flex w-32 shrink-0 items-center justify-center gap-2 px-4 py-3.5 text-sm"
								>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
											gateway.is_public
												? 'border-sky-500/30 bg-sky-500/15 text-sky-500 dark:border-sky-500/45 dark:bg-sky-500/25 dark:text-sky-200'
												: 'border-slate-400/30 bg-slate-400/15 text-slate-500 dark:border-slate-400/50 dark:bg-slate-400/25 dark:text-slate-200'
										}`}
									>
										{formatVisibility(gateway)}
									</span>
								</div>
								<div class="flex w-48 shrink-0 items-center gap-2 px-4 py-3.5 text-sm">
									<div>
										<p class="text-slate-700 dark:text-slate-200">
											{formatTimestamp(gateway.updated_at ?? gateway.created_at)}
										</p>
										<p class="text-xs text-slate-400 dark:text-slate-400">Updated</p>
									</div>
								</div>
								<div class="flex w-40 shrink-0 items-center gap-2 px-4 py-3.5 text-sm">
									<div>
										<p class="text-slate-700 dark:text-slate-200">
											{formatDate(gateway.created_at)}
										</p>
										<p class="text-xs text-slate-400 dark:text-slate-400">Created</p>
									</div>
								</div>
								<div
									class="flex w-48 shrink-0 flex-wrap items-center justify-center gap-2 px-4 py-3.5 text-sm"
								>
									<button
										type="button"
										class="inline-flex items-center gap-1.5 rounded-full border border-blue-600 bg-blue-600/10 px-3.5 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600/15 dark:border-blue-200/50 dark:bg-blue-200/10 dark:text-blue-200 dark:hover:bg-blue-200/25"
										onclick={(event) => {
											event.stopPropagation();
											handleRowAction(gateway);
										}}
									>
										<Icon data={mdiEye} size="0.95em" />
										<span>Devices</span>
									</button>
									<button
										type="button"
										class="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-400/10 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-400/20 dark:border-slate-400/50 dark:bg-slate-400/20 dark:text-slate-200"
										onclick={(event) => openGatewayUsers(gateway, event)}
									>
										<Icon data={mdiPlus} size="0.95em" />
										<span>User</span>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="space-y-4 md:hidden">
				{#each tableGateways as gateway (gateway.id ?? gateway.gateway_id)}
					<article
						class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-lg"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="text-base font-semibold text-slate-900 dark:text-slate-200">
									{gateway.gateway_name || 'Unnamed Gateway'}
								</p>
								<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
									ID: {gateway.gateway_id}
								</p>
							</div>
							<span
								class={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
									gateway.is_online
										? 'border-green-500/35 bg-green-500/15 text-green-600 dark:border-green-500/45 dark:bg-green-500/25 dark:text-green-200'
										: 'border-red-500/35 bg-red-500/18 text-red-700 dark:border-red-500/50 dark:bg-red-500/30 dark:text-red-100'
								}`}
							>
								{gateway.is_online ? 'Online' : 'Offline'}
							</span>
						</div>
						<dl class="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
							<div>
								<dt
									class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
								>
									Visibility
								</dt>
								<dd class="mt-0.5">{formatVisibility(gateway)}</dd>
							</div>
							<div>
								<dt
									class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
								>
									Last activity
								</dt>
								<dd class="mt-0.5">{formatTimestamp(gateway.updated_at ?? gateway.created_at)}</dd>
							</div>
							<div>
								<dt
									class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
								>
									Created
								</dt>
								<dd class="mt-0.5">{formatDate(gateway.created_at)}</dd>
							</div>
						</dl>
						<div class="mt-4 flex flex-wrap gap-3">
							<button
								type="button"
								class="inline-flex items-center gap-1.5 rounded-full border border-blue-600 bg-blue-600/10 px-3.5 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600/15 dark:border-blue-200/50 dark:bg-blue-200/10 dark:text-blue-200 dark:hover:bg-blue-200/25"
								onclick={(event) => toggleConnectedDevices(gateway, event)}
							>
								<Icon data={mdiEye} size="0.95em" />
								<span>Devices</span>
							</button>
							<button
								type="button"
								class="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-400/10 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-400/20 dark:border-slate-400/50 dark:bg-slate-400/20 dark:text-slate-200"
								onclick={() => openGatewayUsers(gateway)}
							>
								<Icon data={mdiCog} size="0.95em" />
								<span>Users</span>
							</button>
						</div>
					</article>
				{/each}
			</div>
		</div>
	{:else if isSearching}
		<div
			class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-600 dark:border-gray-700 dark:bg-slate-800/60 dark:text-slate-200"
		>
			<Icon class="text-slate-400" path={mdiMagnify} size="48" />
			<p class="text-lg font-semibold text-slate-900 dark:text-slate-200">
				No gateways match your search
			</p>
			<p class="max-w-md text-sm text-slate-500 dark:text-slate-400">
				No gateways match "{searchTerm}". Try a different keyword or clear the search field.
			</p>
			<button
				class="h-11 rounded-lg border-none bg-gradient-to-br from-blue-500 to-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-px hover:shadow-blue-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
				type="button"
				onclick={() => (searchTerm = '')}
			>
				Clear search
			</button>
		</div>
	{:else}
		<div
			class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-600 dark:border-gray-700 dark:bg-slate-800/60 dark:text-slate-200"
		>
			<Icon class="text-slate-400" path={mdiAlert} size="48" />
			<p class="text-lg font-semibold text-slate-900 dark:text-slate-200">No gateways yet</p>
			<p class="max-w-md text-sm text-slate-500 dark:text-slate-400">
				Connect your first gateway to start monitoring health and invite collaborators.
			</p>
			<button
				class="h-11 rounded-lg border-none bg-gradient-to-br from-blue-500 to-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-px hover:shadow-blue-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
				type="button"
				onclick={handleAddGatewayUser}
			>
				Add Gateway User
			</button>
		</div>
	{/if}
</div>

<Dialog bind:open={showDevicesDialog} size="lg">
	{#snippet title()}
		Connected Devices - {selectedGateway?.gateway_name || 'Unnamed Gateway'}
	{/snippet}
	{#snippet body()}
		{#if selectedGateway}
			<ConnectedDevicesList devices={getConnectedDevices(selectedGateway)} />
		{/if}
	{/snippet}
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showDevicesDialog = false)}>Close</Button>
	{/snippet}
</Dialog>
