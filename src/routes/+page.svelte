<script lang="ts">
	import {
		CwButton,
		CwDataTable,
		CwDuration,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { IDevice } from '$lib/interfaces/device.interface';

	let { data } = $props();
	let pageSize: number = $state(10);

	const columns: CwColumnDef<IDevice>[] = [
		{ key: 'name', header: 'Device Name', sortable: true },
		{ key: 'dev_eui', header: 'DevEUI', width: '12rem', hideBelow: 'sm' },
		{ key: 'location_name', header: 'Location', sortable: true },
		{ key: 'lastSeen', header: 'Last Seen', sortable: true, hideBelow: 'md', cell: (row) => new Date(row.created_at).toLocaleString() }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<IDevice>> {
		await new Promise((r) => setTimeout(r, 400));
		let items = [...data.devices] as IDevice[];
		if (query.search) {
			const s = query.search.toLowerCase();
			items = items.filter((d) => d.name.toLowerCase().includes(s) || d.dev_eui.includes(s));
		}
		if (query.sort) {
			const k = query.sort.column as keyof IDevice;
			items.sort((a, b) => {
				const av = a[k],
					bv = b[k];
				return query.sort!.direction === 'asc'
					? String(av).localeCompare(String(bv))
					: String(bv).localeCompare(String(av));
			});
		}
		const start = (query.page - 1) * query.pageSize;
		return { rows: items.slice(start, start + query.pageSize), total: items.length };
	}

	function handleDetail(device: IDevice) {
		alert(`Details: ${device.name}`);
	}
</script>

<CwDataTable {columns} {loadData} rowKey="dev_eui" searchable {pageSize} actionsHeader="Actions">
	{#snippet toolbarActions()}
		<CwButton size="sm" variant="ghost">⋮</CwButton>
	{/snippet}

	{#snippet cell(row: IDevice, col: CwColumnDef<IDevice>, defaultValue: string)}
		{#if col.key === 'lastSeen'}
			<CwDuration from={row.created_at} />
		{:else}
			{defaultValue}
		{/if}
	{/snippet}

	{#snippet rowActions(row: IDevice)}
		<div class="row-actions">
			<CwButton size="sm" variant="info" onclick={() => handleDetail(row)}>Details</CwButton>
		</div>
	{/snippet}
</CwDataTable>
