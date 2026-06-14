<script lang="ts">
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import TRASH_ICON from '$lib/images/icons/trash.svg';

	interface Props {
		templateId: number;
		reportName: string;
		onDeleted?: (templateId: number) => void | Promise<void>;
	}

	let { templateId, reportName, onDeleted }: Props = $props();

	const toast = useCwToast();
	const app = getAppContext();
	let open = $state(false);
	let deleting = $state(false);

	async function handleDelete() {
		if (deleting) return;
		deleting = true;

		try {
			const api = new ApiService({ authToken: app.accessToken });
			await api.deleteReportTemplate(templateId);
			open = false;
			await onDeleted?.(templateId);
			toast.add({
				tone: 'success',
				message: m.reports_new_deleted_success({ name: reportName }),
				duration: 4000,
				dismissible: true
			});
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(error, m.reports_new_delete_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			deleting = false;
		}
	}
</script>

<CwButton variant="danger" size="md" disabled={deleting} onclick={() => (open = true)}>
	<Icon src={TRASH_ICON} alt={m.action_delete()} />
</CwButton>

<CwDialog bind:open title={m.reports_new_delete_template()}>
	<p>{m.reports_new_delete_confirmation({ name: reportName })}</p>

	{#snippet actions()}
		<div class="reports-new-delete-dialog__actions">
			<CwButton variant="secondary" size="md" disabled={deleting} onclick={() => (open = false)}>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				variant="danger"
				size="md"
				loading={deleting}
				disabled={deleting}
				onclick={handleDelete}
			>
				{m.action_delete()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	.reports-new-delete-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 639px) {
		.reports-new-delete-dialog__actions {
			flex-direction: column;
		}
	}
</style>
