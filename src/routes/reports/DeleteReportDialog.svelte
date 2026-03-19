<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import TRASH_ICON from '$lib/images/icons/trash.svg';

	type DeleteReportDialogProps = {
		reportId: string;
		reportName: string;
		onDeleted?: (reportId: string) => void | Promise<void>;
	};

	let { reportId, reportName, onDeleted }: DeleteReportDialogProps = $props();

	let open = $state(false);
	const app = $state(getAppContext());
	const toast = useCwToast();
	let deleting = $state(false);

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

	function getDeleteErrorMessage(error: unknown): string {
		const fallback = m.reports_delete_failed();

		if (error instanceof ApiServiceError) {
			return readErrorMessage(error.payload) ?? fallback;
		}

		if (error instanceof Error) {
			const message = error.message.trim();
			return message.length > 0 ? message : fallback;
		}

		return fallback;
	}

	function getDeleteSuccessMessage(name: string): string {
		const trimmed = name.trim();
		return trimmed.length > 0
			? m.reports_deleted_named({ name: trimmed })
			: m.reports_deleted_successfully();
	}

	const deleteReport = async (id: string) => {
		const trimmedId = id.trim();
		if (deleting) return;
		if (!trimmedId) {
			toast.add({
				tone: 'danger',
				message: m.reports_delete_missing_id()
			});
			return;
		}

		deleting = true;

		try {
			const api = new ApiService({
				authToken: app.accessToken
			});
			await api.deleteReport(trimmedId);

			open = false;
			await onDeleted?.(trimmedId);
			toast.add({ tone: 'success', message: getDeleteSuccessMessage(reportName) });

			try {
				await invalidateAll();
			} catch (refreshError) {
				console.error('Deleted report but failed to refresh reports page:', {
					reportId: trimmedId,
					refreshError
				});
			}
		} catch (error) {
			const message = getDeleteErrorMessage(error);
			console.error('Error deleting report:', { reportId: trimmedId, error });
			toast.add({ tone: 'danger', message });
		} finally {
			deleting = false;
		}
	};
</script>

<CwButton icon={TRASH_ICON} variant="danger" disabled={deleting} onclick={() => (open = true)}>
	{m.reports_delete_report()}
</CwButton>

<CwDialog bind:open title={m.reports_confirm_delete_title()}>
	<p>{m.reports_confirm_delete_body({ name: reportName })}</p>
	<div class="mt-4 flex justify-end gap-2">
		<CwButton variant="primary" disabled={deleting} onclick={() => (open = false)}>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			variant="danger"
			loading={deleting}
			disabled={deleting}
			onclick={() => void deleteReport(reportId)}>{m.action_delete()}</CwButton
		>
	</div>
</CwDialog>
