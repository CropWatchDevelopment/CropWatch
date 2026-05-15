<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';
	import { formatDateTime } from '$lib/i18n/format';
	import CHECK_ICON from '$lib/images/icons/check_circle.svg';
	import NO_ICON from '$lib/images/icons/no.svg';
	import { buildGatewayTableResult, type GatewayTableRow } from './gateway-table';

	let loading = $state(false);
	let app = getAppContext();

	const columns: CwColumnDef<GatewayTableRow>[] = [
		{ key: 'gateway_name', header: m.gateways_gateway_name(), sortable: true },
		{ key: 'gateway_id', header: m.gateways_gateway_id() },
		{ key: 'is_online', header: m.gateways_status(), sortable: true },
		{ key: 'is_public', header: m.gateways_public(), sortable: true },
		{ key: 'updated_at', header: m.common_created(), sortable: true }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<GatewayTableRow>> {
		const api = new ApiService({ authToken: app.accessToken });
		const gateways = await api.getGateways();

		return buildGatewayTableResult(gateways, query);
	}
</script>

<svelte:head>
	<title>{m.gateways_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton variant="secondary" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.gateways_your_gateways()}>
		<CwDataTable {columns} {loadData} {loading} rowKey="tableRowKey" class="w-full">
			{#snippet cell(row: GatewayTableRow, col: CwColumnDef<GatewayTableRow>, defaultValue: string)}
				{#if col.key === 'is_online'}
					{#if row.is_online}
						<Icon src={CHECK_ICON} alt={m.gateways_online()} preserveColor />
					{:else}
						<span class="text-red-500">
							<Icon src={NO_ICON} alt={m.gateways_offline()} />
						</span>
					{/if}
				{:else if col.key === 'is_public'}
					{#if row.is_public}
						<Icon src={CHECK_ICON} alt={m.gateways_public()} preserveColor />
					{:else}
						<span class="text-red-500">
							<Icon src={NO_ICON} alt={m.gateways_private()} />
						</span>
					{/if}
				{:else if col.key === 'updated_at'}
					{row.updated_at
						? formatDateTime(row.updated_at, undefined, m.common_not_available())
						: m.common_not_available()}
				{:else}
					{defaultValue}
				{/if}
			{/snippet}
		</CwDataTable>
	</CwCard>
</AppPage>
