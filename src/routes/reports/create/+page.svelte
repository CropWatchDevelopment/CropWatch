<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import ReportTemplateForm from '../ReportTemplateForm.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.reports_new_create_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/reports'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="reports-new-create__header">
		<h1>{m.reports_new_create_template()}</h1>
	</div>

	<ReportTemplateForm
		mode="create"
		context={data.context}
		authToken={data.authToken}
		preselectedDevEui={data.devEui}
		currentUserEmail={data.currentUserEmail}
		currentUserName={data.currentUserName}
	/>
</AppPage>

<style>
	.reports-new-create__header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}
</style>
