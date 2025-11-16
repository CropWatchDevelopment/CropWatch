<!-- Locations Dashboard with Custom Grid -->
<script lang="ts">
	import {
		mdiMapMarker,
		mdiDevices,
		mdiEye,
		mdiCog,
		mdiPlus,
		mdiSort,
		mdiSortAscending,
		mdiSortDescending,
		mdiMagnify
	} from '$lib/icons/mdi';
	import Button from '$lib/components/ui/base/Button.svelte';
	import Card from '$lib/components/ui/base/Card.svelte';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import type { LocationWithDevices } from './+page.server';

	// Svelte 5 props declaration with proper typing
	interface PageData {
		locations: LocationWithDevices[];
	}

	let { data }: { data: PageData } = $props();

	let rawLocations = $derived(data.locations || []);

	// Custom grid state
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let searchTerm = $state('');

	// Column configuration
	interface Column {
		key: string;
		label: string;
		width: string;
		sortable: boolean;
		align?: 'left' | 'center' | 'right';
	}

	const columns: Column[] = [
		{ key: 'name', label: 'Location', width: 'min-w-[14rem] md:w-72', sortable: true },
		{ key: 'description', label: 'Description', width: 'flex-1 min-w-[16rem]', sortable: false },
		{ key: 'coordinates', label: 'Coordinates', width: 'min-w-[10rem] md:w-48', sortable: false },
		{
			key: 'deviceCount',
			label: 'Devices',
			width: 'min-w-[6rem] md:w-32',
			sortable: true,
			align: 'right'
		},
		{ key: 'created_at', label: 'Created', width: 'min-w-[10rem] md:w-40', sortable: true },
		{
			key: 'actions',
			label: 'Actions',
			width: 'min-w-[8rem] md:w-40',
			sortable: false,
			align: 'center'
		}
	];

	// Transform and filter location data
	let processedData = $derived.by(() => {
		let enhancedLocations = (rawLocations || []).map((location: LocationWithDevices) => ({
			...location,
			deviceCount: location.cw_devices?.length || 0,
			coordinates: location.lat && location.long ? `${location.lat}, ${location.long}` : null
		}));

		// Apply search filter
		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase();
			enhancedLocations = enhancedLocations.filter(
				(location) =>
					location.name?.toLowerCase().includes(search) ||
					location.description?.toLowerCase().includes(search) ||
					location.coordinates?.toLowerCase().includes(search)
			);
		}

		// Apply sorting
		if (sortColumn) {
			enhancedLocations.sort((a, b) => {
				let aVal = a[sortColumn as keyof typeof a];
				let bVal = b[sortColumn as keyof typeof b];

				// Handle null/undefined values
				if (aVal == null && bVal == null) return 0;
				if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
				if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

				// Handle different data types
				if (sortColumn === 'created_at') {
					aVal = new Date(aVal as string).getTime();
					bVal = new Date(bVal as string).getTime();
				} else if (typeof aVal === 'string' && typeof bVal === 'string') {
					aVal = aVal.toLowerCase();
					bVal = bVal.toLowerCase();
				}

				if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
				if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			});
		}

		return enhancedLocations;
	});

	// Sorting function
	function handleSort(columnKey: string) {
		if (!columns.find((col) => col.key === columnKey)?.sortable) return;

		if (sortColumn === columnKey) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = columnKey;
			sortDirection = 'asc';
		}
	}

	// Navigation functions
	function viewLocation(locationId: string) {
		window.location.href = `/app/dashboard/location/${locationId}`;
	}

	function editLocation(locationId: string) {
		window.location.href = `/app/dashboard/location/${locationId}/settings`;
	}
</script>

<svelte:head>
	<title>All Locations | CropWatch Dashboard</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Locations</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Manage and view all your monitoring locations
			</p>
		</div>

		<Button
			variant="fill"
			color="primary"
			icon={mdiPlus}
			href="/app/dashboard/location/create"
			class="px-6 py-2"
		>
			Add Location
		</Button>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
					<Icon data={mdiMapMarker} class="text-blue-600 dark:text-blue-400" size="1.5em" />
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Total Locations</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">
						{data?.locations?.length || 0}
					</p>
				</div>
			</div>
		</Card>

		<Card class="p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-green-100 p-2 dark:bg-green-900">
					<Icon data={mdiDevices} class="text-green-600 dark:text-green-400" size="1.5em" />
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">
						{(data?.locations || []).reduce(
							(sum: number, loc: LocationWithDevices) => sum + (loc.cw_devices?.length || 0),
							0
						)}
					</p>
				</div>
			</div>
		</Card>

		<Card class="p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
					<Icon data={mdiMapMarker} class="text-purple-600 dark:text-purple-400" size="1.5em" />
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Active Locations</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">
						{(rawLocations || []).filter(
							(loc: LocationWithDevices) => (loc.cw_devices?.length || 0) > 0
						).length}
					</p>
				</div>
			</div>
		</Card>
	</div>

	<!-- Responsive Locations Table -->
	<Card class="space-y-5 p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Locations overview</h2>
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
					A consistent table layout shared with reports and notifications.
				</p>
			</div>
			<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
				<div class="search-container w-full md:w-auto md:min-w-[18rem]">
					<div class="relative w-full">
						<Icon
							data={mdiMagnify}
							class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
							size="1em"
						/>
						<input
							type="text"
							placeholder="Search locations..."
							bind:value={searchTerm}
							class="search-input"
							aria-label="Search locations"
						/>
					</div>
				</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">
					{processedData.length}
					{processedData.length === 1 ? 'location' : 'locations'}
				</div>
			</div>
		</div>

		{#if processedData.length > 0}
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
							{#each processedData as loc (loc.location_id)}
								<div
									class="table-row--interactive table-row"
									role="button"
									tabindex="0"
									onclick={() => viewLocation(loc.location_id)}
									onkeydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											viewLocation(loc.location_id);
										}
									}}
								>
									<div class="table-cell min-w-[14rem] md:w-72">
										<div class="flex items-center gap-3">
											<Icon
												data={mdiMapMarker}
												class="text-blue-600 dark:text-blue-300"
												size="1em"
											/>
											<div class="min-w-0">
												<p class="cell-title">{loc.name || 'Unnamed location'}</p>
												<p class="cell-muted">ID: {loc.location_id}</p>
											</div>
										</div>
									</div>
									<div class="table-cell min-w-[16rem] flex-1">
										<p class="cell-primary truncate">
											{loc.description || 'No description provided'}
										</p>
									</div>
									<div class="table-cell min-w-[10rem] md:w-48">
										{#if loc.lat && loc.long}
											<p class="cell-mono">
												{loc.lat.toFixed(4)}, {loc.long.toFixed(4)}
											</p>
										{:else}
											<p class="cell-muted">Not set</p>
										{/if}
									</div>
									<div class="table-cell min-w-[6rem] justify-end md:w-32">
										<span
											class={`device-pill ${loc.deviceCount > 0 ? 'device-pill--active' : 'device-pill--idle'}`}
										>
											{loc.deviceCount}
											{loc.deviceCount === 1 ? 'device' : 'devices'}
										</span>
									</div>
									<div class="table-cell min-w-[10rem] md:w-40">
										<p class="cell-primary">{new Date(loc.created_at).toLocaleDateString()}</p>
									</div>
									<div class="table-actions table-cell min-w-[8rem] justify-center gap-2 md:w-40">
										<button
											type="button"
											class="action-button"
											onclick={(event) => {
												event.stopPropagation();
												viewLocation(loc.location_id);
											}}
										>
											<Icon data={mdiEye} size="0.95em" />
											<span>View</span>
										</button>
										<button
											type="button"
											class="action-button action-button--secondary"
											onclick={(event) => {
												event.stopPropagation();
												editLocation(loc.location_id);
											}}
										>
											<Icon data={mdiCog} size="0.95em" />
											<span>Settings</span>
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="space-y-4 md:hidden">
					{#each processedData as loc (loc.location_id)}
						<article class="mobile-card">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="mobile-card__title">{loc.name || 'Unnamed location'}</p>
									<p class="mobile-card__subtitle">
										{loc.description || 'No description provided'}
									</p>
								</div>
								<span
									class={`device-pill ${loc.deviceCount > 0 ? 'device-pill--active' : 'device-pill--idle'}`}
								>
									{loc.deviceCount}
									{loc.deviceCount === 1 ? 'device' : 'devices'}
								</span>
							</div>
							<dl class="mobile-card__meta">
								<div>
									<dt>Coordinates</dt>
									<dd>
										{#if loc.lat && loc.long}
											{loc.lat.toFixed(4)}, {loc.long.toFixed(4)}
										{:else}
											Not set
										{/if}
									</dd>
								</div>
								<div>
									<dt>Created</dt>
									<dd>{new Date(loc.created_at).toLocaleDateString()}</dd>
								</div>
							</dl>
							<div class="mobile-card__actions">
								<button
									type="button"
									class="action-button"
									onclick={() => viewLocation(loc.location_id)}
								>
									<Icon data={mdiEye} size="0.95em" />
									<span>View</span>
								</button>
								<button
									type="button"
									class="action-button action-button--secondary"
									onclick={() => editLocation(loc.location_id)}
								>
									<Icon data={mdiCog} size="0.95em" />
									<span>Settings</span>
								</button>
							</div>
						</article>
					{/each}
				</div>
			</div>
		{:else if searchTerm.trim()}
			<div class="empty-state">
				<Icon class="empty-state__icon" data={mdiMagnify} size="3em" />
				<p class="empty-state__title">No locations match your search</p>
				<p class="empty-state__body">
					No locations match "{searchTerm}". Try a different keyword or clear the search field.
				</p>
				<Button variant="outline" onclick={() => (searchTerm = '')}>Clear search</Button>
			</div>
		{:else}
			<div class="empty-state">
				<Icon class="empty-state__icon" data={mdiMapMarker} size="3em" />
				<p class="empty-state__title">No locations yet</p>
				<p class="empty-state__body">Get started by creating your first monitoring location.</p>
				<Button variant="fill" color="primary" icon={mdiPlus} href="/app/dashboard/location/create">
					Create Location
				</Button>
			</div>
		{/if}
	</Card>
</div>

<style>
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
		box-shadow: 0 0 0 3px rgba(59 130 246, 0.15);
	}

	.search-input::placeholder {
		color: rgb(156 163 175);
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

	.sort-icon {
		color: inherit;
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

	.cell-mono {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.85rem;
		color: rgb(30 64 175);
	}

	.device-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 600;
		border: 1px solid transparent;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.device-pill--active {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(22 163 74);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.device-pill--idle {
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
		padding: 0.3rem 0.8rem;
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
		box-shadow: 0 0 0 3px rgba(147 197 253, 0.15);
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

	:global(.dark) .cell-mono {
		color: rgb(191 219 254);
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
