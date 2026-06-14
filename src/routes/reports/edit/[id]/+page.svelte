<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import { CwButton, CwChip } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import ReportTemplateForm from '../../ReportTemplateForm.svelte';

	let { data }: PageProps = $props();
	const templateId = (() => data.context.template?.id ?? 0)();
</script>

<svelte:head>
	<title>{m.reports_new_edit_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/reports'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="reports-new-edit__header">
		<h1>{m.reports_new_edit_template()}</h1>
		<CwChip
			label={`${m.reports_new_template_id()}: ${templateId}`}
			tone="info"
			variant="outline"
			size="sm"
		/>
	</div>

	<ReportTemplateForm mode="edit" context={data.context} authToken={data.authToken} />
</AppPage>

<style>
	.reports-new-edit__header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--cw-space-3);
	}

	.reports-new-edit__header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}
</style>
