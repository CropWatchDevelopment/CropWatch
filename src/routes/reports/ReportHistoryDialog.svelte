<script lang="ts">
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
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
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { type PdfFile } from '$lib/interfaces/PdfFile.interface';
	import HISTORY_ICON from '$lib/images/icons/history.svg';

	type ReportHistoryRow = { dev_eui: string; report_id: string; name: string; created_at: string };

	let { open = $bindable(), dev_eui, report_id }: { open?: boolean; dev_eui: string; report_id: string } = $props();
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
			action === 'load' ? m.reports_history_load_failed() : m.reports_download_failed();

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
			name: file.name,
			created_at: formatDateTime(file.created_at)
		}));
	}

	async function loadData(_query: CwTableQuery): Promise<CwTableResult<ReportHistoryRow>> {
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

	async function handleDownload(dev_eui: string, report_id: string, name: string) {
		try {
			const response = await createApiService().getReportDownloadUrl(dev_eui, report_id, name);
			const signedUrl = typeof response.url === 'string' ? response.url : null;
			if (!signedUrl) {
				const message = m.reports_download_missing_signed_url();
				console.error('Download failed: signed URL missing', { dev_eui, report_id, response });
				toast.add({ tone: 'danger', message });
				return;
			}

			window.open(signedUrl, '_blank', 'noopener');
		} catch (error) {
			const message = getRequestErrorMessage('download', error);
			console.error('Error downloading file', { dev_eui, report_id, error });
			toast.add({ tone: 'danger', message });
		}
	}
</script>

<CwButton variant="info" size="md" onclick={() => (open = true)}>
	<Icon src={HISTORY_ICON} alt={m.reports_history_title()} />
</CwButton>

<CwDialog {open} title={m.reports_history_title()} onclose={() => (open = false)} class="w-full">
	<CwCard title={m.reports_problem_reports()} class="mb-4 p-4">
		<CwTooltip tone="info" position="left" value={m.reports_problem_reports_tooltip()}>
			<CwButton variant="primary" disabled>{m.reports_problems_only_report()}</CwButton>
		</CwTooltip>
	</CwCard>

	{#if open}
		<CwDataTable
			columns={[
				{ key: 'id', header: 'ID' },
				{ key: 'name', header: 'Name' },
				{ key: 'created_at', header: m.reports_created_at() },
				// { key: 'dev_eui', header: 'Dev EUI' },
			]}
			rowActionsHeader={m.common_actions()}
			{loadData}
			rowKey="name"
		>

			{#snippet rowActions(row: ReportHistoryRow)}
				<CwButton
					size="sm"
					variant="secondary"
					onclick={() => {
						handleDownload(dev_eui, report_id, row.name);
					}}
				>
					{m.action_download()}
				</CwButton>
			{/snippet}
		</CwDataTable>
	{/if}

	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>{m.action_close()}</CwButton>
	{/snippet}
</CwDialog>
