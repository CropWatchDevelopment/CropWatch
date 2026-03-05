<script lang="ts">
	import { PUBLIC_API_BASE_URL, PUBLIC_REPORTS_ENDPOINT } from '$env/static/public';
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
	const endpoint = `${PUBLIC_API_BASE_URL}${PUBLIC_REPORTS_ENDPOINT}/history/${dev_eui}`;
	const app = $state(getAppContext());
	let files: PdfFile[] = $state([]);

	async function loadData(
		query: CwTableQuery
	): Promise<CwTableResult<{ id: string; name: string; created_at: string }>> {
		const rows = !open
			? []
			: await fetch(endpoint, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						...(app.accessToken ? { Authorization: `Bearer ${app.accessToken}` } : undefined)
					}
				})
					.then((res) => res.json())
					.then((data: PdfFile[]) => {
						files = data;
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
		const downloadUrl = `${PUBLIC_API_BASE_URL}${PUBLIC_REPORTS_ENDPOINT}/download/${dev_eui}/${encodeURIComponent(name)}`;
		try {
			const res = await fetch(downloadUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					...(app.accessToken ? { Authorization: `Bearer ${app.accessToken}` } : undefined)
				}
			});
			if (!res.ok) {
				console.error('Download failed:', res.status, res.statusText);
				return;
			}
			const { url: signedUrl } = await res.json();
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
        <CwTooltip tone="info" position="left" value="This report is under development. Please check back later.">
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
