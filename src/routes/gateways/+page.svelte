<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwStatusDot,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { backHref } from '$lib/navigation/backTo';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { formatDateTime } from '$lib/i18n/format';
	import CHECK_ICON from '$lib/images/icons/check_circle.svg';
	import NO_ICON from '$lib/images/icons/no.svg';
	import { buildGatewayTableResult, type GatewayTableRow } from './gateway-table';

	let loading = $state(false);
	let app = getAppContext();

	const columns: CwColumnDef<GatewayTableRow>[] = [
		{ key: 'gateway_name', header: m.gateways_gateway_name(), sortable: true },
		{ key: 'is_online', header: m.gateways_status(), sortable: true },
		{ key: 'connected_device_count', header: m.gateways_connected_devices(), sortable: true },
		{ key: 'last_seen_at', header: m.gateways_last_seen(), sortable: true },
		{ key: 'gateway_id', header: m.gateways_gateway_id() },
		{ key: 'is_public', header: m.gateways_public(), sortable: true }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<GatewayTableRow>> {
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const gateways = await api.getGateways({ signal: query.signal });

			return buildGatewayTableResult(gateways, query);
		} catch (error) {
			throw new Error(readApiErrorMessage(error, m.generic_error()));
		}
	}
</script>

<svelte:head>
	<title>{m.gateways_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton
		id="gateways-back-button"
		variant="secondary"
		onclick={() => goto(resolve(backHref(page.url, '/') as '/'))}
	>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.gateways_your_gateways()}>
		<CwDataTable
			id="gateways-table"
			labels={cwDataTableLabels()}
			{columns}
			{loadData}
			{loading}
			rowKey="tableRowKey"
			class="w-full"
			onRowClick={(row) => goto(resolve('/gateways/[gateway_id]', { gateway_id: row.gateway_id }))}
		>
			{#snippet cell(row: GatewayTableRow, col: CwColumnDef<GatewayTableRow>, defaultValue: string)}
				{#if col.key === 'is_online'}
					<CwStatusDot
						status={row.is_online ? 'online' : 'offline'}
						label={row.is_online ? m.gateways_online() : m.gateways_offline()}
						showLabel
					/>
				{:else if col.key === 'connected_device_count'}
					{row.connected_device_count ?? 0}
				{:else if col.key === 'is_public'}
					{#if row.is_public}
						<Icon src={CHECK_ICON} alt={m.gateways_public()} preserveColor />
					{:else}
						<span class="text-(--cw-text-muted)">
							<Icon src={NO_ICON} alt={m.gateways_private()} />
						</span>
					{/if}
				{:else if col.key === 'last_seen_at'}
					{formatDateTime(row.last_seen_at ?? '', undefined, m.common_not_available())}
				{:else}
					{defaultValue}
				{/if}
			{/snippet}
		</CwDataTable>
	</CwCard>
</AppPage>
