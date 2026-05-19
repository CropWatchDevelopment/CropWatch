<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import {
		CwButton,
		CwDuration,
		CwLocationCard,
		CwSensorCard,
		CwSpinner
	} from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import type { DashboardLocationGroup, DashboardRow } from '$lib/api/api.dtos';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		formatSensorValue,
		isDisplayableColumn,
		labelFor,
		type SensorFormat
	} from '$lib/sensor-labels';
	import { m } from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';

	interface Filters {
		group: string;
		locationGroup: string;
		location: string;
		name: string;
	}

	const PAGE_SIZE = 20;
	const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

	let { filters }: { filters: Filters } = $props();

	const app = getAppContext();

	let groups = $state<DashboardLocationGroup[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let initialLoaded = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	// dev_eui -> latest row | 'loading' | undefined (not requested yet).
	let detailsByDevEui = $state<Record<string, Record<string, unknown> | 'loading'>>({});

	function buildQuery(overrides: { skip: number; take: number }) {
		return {
			skip: overrides.skip,
			take: overrides.take,
			group: filters.group || undefined,
			locationGroup: filters.locationGroup || undefined,
			location: filters.location || undefined,
			name: filters.name || undefined
		};
	}

	async function loadPage(opts: { reset?: boolean } = {}) {
		if (loading) {
			console.debug('[dashboard] loadPage skipped — already loading');
			return;
		}
		loading = true;
		const skip = opts.reset ? 0 : groups.length;
		console.debug('[dashboard] loadPage', { reset: !!opts.reset, skip, take: PAGE_SIZE });
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const page = await api.getDashboardLocations(buildQuery({ skip, take: PAGE_SIZE }));
			console.debug('[dashboard] loadPage result', {
				returned: page.groups.length,
				total: page.total
			});
			groups = opts.reset ? page.groups : [...groups, ...page.groups];
			total = page.total;
		} catch (err) {
			console.error('Failed to load dashboard page', err);
		} finally {
			loading = false;
			initialLoaded = true;
		}
	}

	async function refreshLoaded() {
		if (groups.length === 0) return;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const page = await api.getDashboardLocations(
				buildQuery({ skip: 0, take: Math.max(groups.length, PAGE_SIZE) })
			);

			// Patch existing devices in place by dev_eui so card positions don't shift.
			const newRowsByDevEui = new Map<string, DashboardRow>();
			for (const g of page.groups) for (const d of g.devices) newRowsByDevEui.set(d.dev_eui, d);

			for (const existingGroup of groups) {
				for (const existing of existingGroup.devices) {
					const next = newRowsByDevEui.get(existing.dev_eui);
					if (next) {
						existing.latest = next.latest;
						existing.last_data_updated_at = next.last_data_updated_at;
						existing.upload_interval = next.upload_interval;
					}
				}
			}
			total = page.total;
		} catch (err) {
			console.error('Failed to refresh dashboard', err);
		}
	}

	async function loadDetails(devEui: string) {
		if (detailsByDevEui[devEui] !== undefined) return;
		detailsByDevEui[devEui] = 'loading';
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const latest = await api.getDashboardDeviceLatest(devEui);
			detailsByDevEui[devEui] = latest ?? {};
		} catch (err) {
			console.error(`Failed to load details for ${devEui}`, err);
			delete detailsByDevEui[devEui];
		}
	}

	function primaryProps(row: DashboardRow) {
		const col = row.device_type.primary_data_v2;
		if (!col || col === '-') return { value: null, unit: '', label: undefined };
		const def = labelFor(col);
		return readingProps(def.format, def.unit, row.latest?.primary);
	}

	function secondaryProps(row: DashboardRow) {
		const col = row.device_type.secondary_data_v2;
		if (!col || col === '' || col === '-') return { value: null, unit: '', label: undefined };
		const def = labelFor(col);
		return readingProps(def.format, def.unit, row.latest?.secondary);
	}

	function detailEntries(details: Record<string, unknown>) {
		return Object.entries(details)
			.filter(([col, value]) => isDisplayableColumn(col) && value !== null && value !== undefined)
			.map(([col, value]) => {
				const def = labelFor(col);
				return { col, def, formatted: formatSensorValue(value, def.format) };
			});
	}

	function readingProps(format: SensorFormat, unit: string, raw: unknown) {
		const v = formatSensorValue(raw, format);
		if (format === 'boolean') {
			return { value: null, unit: '', label: v.display };
		}
		return { value: v.numeric, unit, label: undefined };
	}

	function statusFor(row: DashboardRow) {
		return row.latest ? 'online' : 'loading';
	}

	function expireMinutes(row: DashboardRow): number {
		return row.upload_interval ?? row.device_type.default_upload_interval ?? 60;
	}

	function groupLabel(g: DashboardLocationGroup) {
		return g.location?.name ?? m.dashboard_no_location();
	}

	$effect(() => {
		// Track ONLY filter values so this effect re-runs exclusively on filter change,
		// never on internal state writes from loadPage itself.
		const _filterFingerprint =
			filters.group + '|' + filters.locationGroup + '|' + filters.location + '|' + filters.name;
		void _filterFingerprint;
		untrack(() => {
			loadPage({ reset: true });
		});
	});

	onMount(() => {
		pollTimer = setInterval(refreshLoaded, REFRESH_INTERVAL_MS);
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});
</script>

<div class="dashboard-cards__scroll">
	{#if !initialLoaded && loading}
		<div class="dashboard-cards__loading">
			<CwSpinner size="xl" />
		</div>
	{:else if groups.length === 0}
		<p class="dashboard-cards__empty">{m.dashboard_no_devices()}</p>
	{:else}
		<div class="dashboard-cards__groups">
			{#each groups as group (group.key)}
				<CwLocationCard title={groupLabel(group)} class="dashboard-cards__location">
					{#each group.devices as row (row.dev_eui)}
						{@const primary = primaryProps(row)}
						{@const secondary = secondaryProps(row)}
						{@const details = detailsByDevEui[row.dev_eui]}
						{@const detailRows = details && details !== 'loading' ? detailEntries(details) : []}
						<CwSensorCard
							label={row.name}
							status={statusFor(row)}
							primaryValue={primary.value}
							primaryUnit={primary.unit}
							primaryLabel={primary.label}
							secondaryValue={secondary.value}
							secondaryUnit={secondary.unit}
							secondaryLabel={secondary.label}
							lastSeenAt={row.latest?.created_at ?? row.last_data_updated_at ?? undefined}
							expireAfterMinutes={expireMinutes(row)}
							storageKey={`dashboard:${row.dev_eui}`}
							onExpand={() => loadDetails(row.dev_eui)}
						>
							{#if details === undefined || details === 'loading'}
								<p class="dashboard-cards__details-loading">{m.dashboard_loading_details()}</p>
							{:else if detailRows.length === 0}
								<p class="dashboard-cards__details-empty">{m.dashboard_no_data_yet()}</p>
							{:else}
								<dl class="dashboard-cards__details-list">
									{#each detailRows as { col, def, formatted } (col)}
										<div class="dashboard-cards__details-row">
											<dt>{def.label()}</dt>
											<dd>
												{#if def.label() == 'created_at'}
													<CwDuration
														from={formatted.display}
														class="ml-1 text-xs text-slate-400"
													/>
												{:else}
													{formatted.display}{def.unit ? ` ${def.unit}` : ''}
												{/if}
											</dd>
										</div>
									{/each}
								</dl>
								<CwButton
									variant="secondary"
									class="w-full"
									onclick={() => goto(`/locations/${row.location?.location_id ?? ''}/devices/${row.dev_eui}`)}
									>Details</CwButton
								>
							{/if}
						</CwSensorCard>
					{/each}
				</CwLocationCard>
			{/each}
		</div>

		{#if groups.length < total}
			<div class="dashboard-cards__pager">
				<CwButton
					size="sm"
					variant="secondary"
					onclick={() => {
						console.debug('[dashboard] load-more clicked', {
							groups: groups.length,
							total,
							loading
						});
						loadPage();
					}}
				>
					{loading ? '…' : m.dashboard_load_more()}
				</CwButton>
			</div>
		{/if}
	{/if}
</div>

<style>
	.dashboard-cards__scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 0.5rem 1rem 1.5rem;
	}

	.dashboard-cards__loading,
	.dashboard-cards__empty {
		display: flex;
		width: 100%;
		height: 100%;
		justify-content: center;
		padding: 3rem 1rem;
		color: var(--cw-text-muted, #94a3b8);
	}

	/* Responsive grid of location cards.
	   Mobile: 1. Tablet: 2. Small laptop: 3. Desktop: 5. */
	.dashboard-cards__groups {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		align-items: start;
	}
	.dashboard-cards__groups :global(.dashboard-cards__location) {
		width: 100%;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.dashboard-cards__groups {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1024px) {
		.dashboard-cards__groups {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 1280px) {
		.dashboard-cards__groups {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}

	.dashboard-cards__details-list {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
	}

	.dashboard-cards__details-row {
		display: contents;
	}

	.dashboard-cards__details-row dt {
		color: var(--cw-text-muted, #94a3b8);
		font-size: 0.875rem;
	}

	.dashboard-cards__details-row dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}

	.dashboard-cards__details-loading,
	.dashboard-cards__details-empty {
		color: var(--cw-text-muted, #94a3b8);
		font-size: 0.875rem;
		margin: 0;
	}

	.dashboard-cards__pager {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0;
	}
</style>
