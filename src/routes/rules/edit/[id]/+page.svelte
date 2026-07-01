<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import { CwButton, CwChip } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import RuleTemplateForm from '../../RuleTemplateForm.svelte';

	let { data }: PageProps = $props();
	const templateId = (() => data.context.template?.id ?? 0)();
</script>

<svelte:head>
	<title>{m.rules_new_edit_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton id="rule-edit-back-button" variant="secondary" size="sm" onclick={() => goto(resolve('/rules'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="rules-new-edit__header">
		<h1>{m.rules_new_edit_template()}</h1>
		<CwChip
			label={`${m.rules_new_template_id()}: ${templateId}`}
			tone="info"
			variant="outline"
			size="sm"
		/>
	</div>

	<RuleTemplateForm mode="edit" context={data.context} authToken={data.authToken} />
</AppPage>

<style>
	.rules-new-edit__header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--cw-space-3);
	}

	.rules-new-edit__header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}
</style>
