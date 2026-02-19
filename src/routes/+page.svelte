<script lang="ts">
	import {
		CwButton,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';

	interface Device {
		id: string;
		name: string;
		eui: string;
		status: string;
		lastSeen: string;
	}

	const mockDevices: Device[] = Array.from({ length: 47 }, (_, i) => ({
		id: `dev-${i + 1}`,
		name: `Sensor ${String(i + 1).padStart(3, '0')}`,
		eui: Array.from({ length: 8 }, () =>
			Math.floor(Math.random() * 256)
				.toString(16)
				.padStart(2, '0')
		).join(':'),
		status: ['online', 'offline', 'warning'][i % 3],
		lastSeen: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
	}));

	const columns: CwColumnDef<Device>[] = [
		{ key: 'name', header: 'Device Name', sortable: true },
		{ key: 'eui', header: 'DevEUI', width: '12rem', hideBelow: 'sm' },
		{ key: 'status', header: 'Status', sortable: true },
		{
			key: 'lastSeen',
			header: 'Last Seen',
			sortable: true,
			hideBelow: 'md',
			cell: (row) => new Date(row.lastSeen).toLocaleString()
		}
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<Device>> {
		await new Promise((r) => setTimeout(r, 400));
		let items = [...mockDevices];
		if (query.search) {
			const s = query.search.toLowerCase();
			items = items.filter((d) => d.name.toLowerCase().includes(s) || d.eui.includes(s));
		}
		if (query.sort) {
			const k = query.sort.column as keyof Device;
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

	function handleEdit(device: Device) {
		alert(`Edit: ${device.name}`);
	}

	function handleDelete(device: Device) {
		alert(`Delete: ${device.name}`);
	}
</script>

<h2>CwDataTable</h2>

<CwDataTable {columns} {loadData} rowKey="id" searchable pageSize={10} actionsHeader="Actions">
	{#snippet toolbarActions()}
		<CwButton size="sm" variant="primary">+ Add Device</CwButton>
		<CwButton size="sm" variant="secondary">Export</CwButton>
	{/snippet}
	{#snippet rowActions(row: Device)}
		<div class="row-actions">
			<CwButton size="sm" variant="ghost" onclick={() => handleEdit(row)}>Edit</CwButton>
			<CwButton size="sm" variant="danger" onclick={() => handleDelete(row)}>Delete</CwButton>
		</div>
	{/snippet}
</CwDataTable>
