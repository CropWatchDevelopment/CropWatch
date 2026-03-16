<script lang="ts">
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwDialog,
		CwTooltip,
		useCwToast,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { type PdfFile } from '$lib/interfaces/PdfFile.interface';

	type ReportHistoryRow = { id: string; name: string; created_at: string };

	let { open = $bindable(), dev_eui }: { open?: boolean; dev_eui: string } = $props();
	const app = $state(getAppContext());
	const toast = useCwToast();

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function readErrorMessage(value: unknown): string | null {
		if (typeof value === 'string') {
			const trimmed = value.trim();
			return trimmed.length > 0 ? trimmed : null;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				const message = readErrorMessage(item);
				if (message) return message;
			}
			return null;
		}

		if (!isRecord(value)) {
			return null;
		}

		return (
			readErrorMessage(value.message) ??
			readErrorMessage(value.error) ??
			readErrorMessage(value.detail) ??
			readErrorMessage(value.payload)
		);
	}

	function getRequestErrorMessage(action: 'load' | 'download', error: unknown): string {
		const fallback =
			action === 'load'
				? 'Unable to load report history right now.'
				: 'Unable to download this report right now.';

		if (error instanceof ApiServiceError) {
			return readErrorMessage(error.payload) ?? fallback;
		}

		if (error instanceof Error) {
			const message = error.message.trim();
			return message.length > 0 ? message : fallback;
		}

		return fallback;
	}

	function createApiService(): ApiService {
		return new ApiService({
			authToken: app.accessToken ?? null
		});
	}

	function mapHistoryRows(files: PdfFile[]): ReportHistoryRow[] {
		return files.map((file) => ({
			id: file.id,
			name: file.name,
			created_at: new Date(file.created_at).toLocaleString()
		}));
	}

	async function loadData(
		_query: CwTableQuery
	): Promise<CwTableResult<ReportHistoryRow>> {
		void _query;

		try {
			const rows = mapHistoryRows(await createApiService().getReportHistory(dev_eui));
			return { rows, total: rows.length };
		} catch (error) {
			const message = getRequestErrorMessage('load', error);
			console.error('Failed to load report history', { dev_eui, error });
			toast.add({ tone: 'danger', message });
			throw new Error(message);
		}
	}

	async function handleDownload(name: string) {
		try {
			const response = await createApiService().getReportDownloadUrl(dev_eui, name);
			const signedUrl = typeof response.url === 'string' ? response.url : null;
			if (!signedUrl) {
				const message = 'Unable to download this report because the signed URL was missing.';
				console.error('Download failed: signed URL missing', { dev_eui, name, response });
				toast.add({ tone: 'danger', message });
				return;
			}

			window.open(signedUrl, '_blank', 'noopener');
		} catch (error) {
			const message = getRequestErrorMessage('download', error);
			console.error('Error downloading file', { dev_eui, name, error });
			toast.add({ tone: 'danger', message });
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

	{#if open}
		<CwDataTable
			columns={[
				{ key: 'id', header: 'ID' },
				{ key: 'name', header: 'Name' },
				{ key: 'created_at', header: 'Created At' }
			]}
			rowActionsHeader="Actions"
			{loadData}
			rowKey="id"
		>
			{#snippet rowActions(row: ReportHistoryRow)}
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
	{/if}

	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>Close</CwButton>
	{/snippet}
</CwDialog>
