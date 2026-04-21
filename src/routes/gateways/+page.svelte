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
	import { ApiService, type GatewayDto } from '$lib/api/api.service';
	import { formatDateTime } from '$lib/i18n/format';
	import CHECK_ICON from '$lib/images/icons/check_circle.svg';
	import NO_ICON from '$lib/images/icons/no.svg';

	let loading = $state(false);
	let app = getAppContext();

	const columns: CwColumnDef<GatewayDto>[] = [
		{ key: 'gateway_name', header: m.gateways_gateway_name(), sortable: true },
		{ key: 'gateway_id', header: m.gateways_gateway_id() },
		{ key: 'is_online', header: m.gateways_status(), sortable: true },
		{ key: 'is_public', header: m.gateways_public(), sortable: true },
		{ key: 'created_at', header: m.common_created(), sortable: true }
	];

	function sortGateways(
		rows: GatewayDto[],
		column: string,
		direction: 'asc' | 'desc'
	): GatewayDto[] {
		const dir = direction === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const aVal = (a as unknown as Record<string, unknown>)[column];
			const bVal = (b as unknown as Record<string, unknown>)[column];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return dir;
			if (bVal == null) return -dir;
			if (typeof aVal === 'boolean') return (Number(aVal) - Number(bVal)) * dir;
			return String(aVal).localeCompare(String(bVal)) * dir;
		});
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<GatewayDto>> {
		const search = query.search?.trim().toLowerCase() || '';
		const api = new ApiService({ authToken: app.accessToken });
		const gateways = await api.getGateways();

		let rows = search
			? gateways.filter(
					(gw) =>
						gw.gateway_name.toLowerCase().includes(search) ||
						gw.gateway_id.toLowerCase().includes(search)
				)
			: gateways;

		if (query.sort) {
			rows = sortGateways(rows, query.sort.column, query.sort.direction);
		}

		const total = rows.length;
		const skip = (query.page - 1) * query.pageSize;
		rows = rows.slice(skip, skip + query.pageSize);

		return { rows, total };
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
		<CwDataTable {columns} {loadData} {loading} rowKey="id" class="w-full">
			{#snippet cell(row: GatewayDto, col: CwColumnDef<GatewayDto>, defaultValue: string)}
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
				{:else if col.key === 'created_at'}
					{formatDateTime(row.created_at, undefined, m.common_not_available())}
				{:else}
					{defaultValue}
				{/if}
			{/snippet}
		</CwDataTable>
	</CwCard>
</AppPage>
