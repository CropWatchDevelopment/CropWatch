<script lang="ts">
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwDialog,
		CwTooltip,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { type PdfFile } from '$lib/interfaces/PdfFile.interface';

	let { open = $bindable(), dev_eui }: { open?: boolean; dev_eui: string } = $props();
	const app = $state(getAppContext());

	async function loadData(
		_query: CwTableQuery
	): Promise<CwTableResult<{ id: string; name: string; created_at: string }>> {
		const api = new ApiService({
			authToken: app.accessToken ?? null
		});
		const rows = !open
			? []
			: await api
					.getReportHistory(dev_eui)
					.then((data: PdfFile[]) => {
						return data.map((file) => ({
							id: file.id,
							name: file.name,
							created_at: new Date(file.created_at).toLocaleString()
						}));
					})
					.catch(() => []);
		return { rows, total: rows.length };
	}

	async function handleDownload(name: string) {
		const api = new ApiService({
			authToken: app.accessToken ?? null
		});
		try {
			const response = await api.getReportDownloadUrl(dev_eui, name);
			const signedUrl = typeof response.url === 'string' ? response.url : null;
			if (!signedUrl) {
				console.error('Download failed: signed URL missing');
				return;
			}
			// Open the signed URL directly — the browser will handle the PDF download
			window.open(signedUrl, '_blank');
		} catch (err) {
			console.error('Error downloading file:', err);
		}
	}
</script>

<CwButton variant="info" size="sm" onclick={() => (open = true)}>History</CwButton>

<CwDialog {open} title="Report History" onclose={() => (open = false)} class="w-full">
	<CwCard title="Problem Reports" class="mb-4 p-4">
		<CwTooltip
			tone="info"
			position="left"
			value="This report is under development. Please check back later."
		>
			<CwButton variant="primary" disabled>Problems Only Report</CwButton>
		</CwTooltip>
	</CwCard>

	<CwDataTable
		columns={[
			{ key: 'id', header: 'ID' },
			{ key: 'name', header: 'Name' },
			{ key: 'created_at', header: 'Created At' }
		]}
		actionsHeader="Actions"
		{loadData}
		rowKey="id"
	>
		{#snippet rowActions(row: { id: string; name: string; created_at: string })}
			<CwButton
				size="sm"
				variant="secondary"
				onclick={() => {
					handleDownload(row.name);
				}}
			>
				Download
			</CwButton>
		{/snippet}
	</CwDataTable>

	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>Close</CwButton>
	{/snippet}
</CwDialog>
