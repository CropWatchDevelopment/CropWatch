<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		CwButton,
		CwCard,
		CwCopy,
		CwDataTable,
		CwStatusDot,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { AppNotice, AppPage } from '$lib/components/layout';
	import type { GatewayDeviceDto } from '$lib/api/api.dtos';
	import { cwCopyLabels, cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { formatDateTime } from '$lib/i18n/format';
	import { sortByColumn } from '$lib/utils/sortByColumn';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const gateway = $derived(data.gateway);
	const devices = $derived(data.gatewayDevices.devices);
	const otherDeviceCount = $derived(data.gatewayDevices.other_device_count);

	const columns: CwColumnDef<GatewayDeviceDto>[] = [
		{ key: 'name', header: m.gateways_device(), sortable: true },
		{ key: 'location_name', header: m.common_location(), sortable: true },
		{ key: 'rssi', header: m.gateways_rssi(), sortable: true },
		{ key: 'snr', header: m.gateways_snr(), sortable: true },
		{ key: 'last_update', header: m.gateways_last_heard(), sortable: true }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<GatewayDeviceDto>> {
		const search = query.search?.trim().toLowerCase() ?? '';
		let rows = search
			? devices.filter(
					(device) =>
						(device.name ?? '').toLowerCase().includes(search) ||
						device.dev_eui.toLowerCase().includes(search) ||
						(device.location_name ?? '').toLowerCase().includes(search)
				)
			: devices;
		if (query.sort) {
			rows = sortByColumn(rows, query.sort.column, query.sort.direction, { nullsLast: true });
		}
		const skip = (query.page - 1) * query.pageSize;
		return { rows: rows.slice(skip, skip + query.pageSize), total: rows.length };
	}
</script>

<svelte:head>
	<title>{gateway?.gateway_name ?? m.gateways_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton
		id="gateway-back-button"
		variant="secondary"
		size="sm"
		onclick={() => goto(resolve('/gateways'))}
	>
		&larr; {m.gateways_back_to_gateways()}
	</CwButton>

	{#if !gateway}
		<AppNotice tone="warning">
			<p>{m.gateways_not_found()}</p>
		</AppNotice>
	{:else}
		<CwCard title={gateway.gateway_name} elevated>
			<dl class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<dt class="text-sm text-(--cw-text-muted)">{m.gateways_status()}</dt>
					<dd>
						<CwStatusDot
							status={gateway.is_online ? 'online' : 'offline'}
							label={gateway.is_online ? m.gateways_online() : m.gateways_offline()}
							showLabel
						/>
					</dd>
				</div>
				<div>
					<dt class="text-sm text-(--cw-text-muted)">{m.gateways_gateway_id()}</dt>
					<dd>
						<CwCopy labels={cwCopyLabels()} value={gateway.gateway_id}>
							<span>{gateway.gateway_id}</span>
						</CwCopy>
					</dd>
				</div>
				<div>
					<dt class="text-sm text-(--cw-text-muted)">{m.gateways_public()}</dt>
					<dd>{gateway.is_public ? m.gateways_public() : m.gateways_private()}</dd>
				</div>
				<div>
					<dt class="text-sm text-(--cw-text-muted)">{m.gateways_last_seen()}</dt>
					<dd>
						{formatDateTime(gateway.last_seen_at ?? '', undefined, m.common_not_available())}
					</dd>
				</div>
				<div>
					<dt class="text-sm text-(--cw-text-muted)">{m.gateways_last_checked()}</dt>
					<dd>
						{formatDateTime(gateway.status_checked_at ?? '', undefined, m.common_not_available())}
					</dd>
				</div>
			</dl>
		</CwCard>

		<CwCard title={m.gateways_connected_devices()} elevated>
			{#if otherDeviceCount > 0}
				<div class="p-4 pb-0">
					<AppNotice tone="neutral">
						<p>{m.gateways_other_devices({ count: otherDeviceCount })}</p>
					</AppNotice>
				</div>
			{/if}
			{#if devices.length === 0}
				<div class="p-4">
					<AppNotice tone="neutral">
						<p>{m.gateways_no_devices()}</p>
					</AppNotice>
				</div>
			{:else}
				<CwDataTable
					id="gateway-devices-table"
					labels={cwDataTableLabels()}
					{columns}
					{loadData}
					rowKey="dev_eui"
					searchable
					pageSize={10}
					onRowClick={(row) => {
						if (row.location_id == null) return;
						goto(
							resolve('/locations/[location_id]/devices/[dev_eui]', {
								location_id: String(row.location_id),
								dev_eui: row.dev_eui
							})
						);
					}}
				>
					{#snippet cell(
						row: GatewayDeviceDto,
						col: CwColumnDef<GatewayDeviceDto>,
						defaultValue: string
					)}
						{#if col.key === 'name'}
							{row.name || row.dev_eui}
						{:else if col.key === 'location_name'}
							{row.location_name ?? m.common_not_available()}
						{:else if col.key === 'rssi'}
							{row.rssi != null ? `${row.rssi} dBm` : m.common_not_available()}
						{:else if col.key === 'snr'}
							{row.snr != null ? `${row.snr} dB` : m.common_not_available()}
						{:else if col.key === 'last_update'}
							{formatDateTime(row.last_update ?? '', undefined, m.common_not_available())}
						{:else}
							{defaultValue}
						{/if}
					{/snippet}
				</CwDataTable>
			{/if}
		</CwCard>
	{/if}
</AppPage>
