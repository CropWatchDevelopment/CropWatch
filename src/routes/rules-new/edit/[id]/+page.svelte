<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import type { DeviceDto } from '$lib/api/api.dtos';
	import type { RuleTemplateDto } from '$lib/rules-new/rule-template.types';
	import { CwButton, CwChip } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import RuleTemplateForm from '../../RuleTemplateForm.svelte';

	let { data }: PageProps = $props();
	const template = (() => data.template as RuleTemplateDto)();
	const devices = (() => data.devices as DeviceDto[])();
</script>

<svelte:head>
	<title>{m.rules_new_edit_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/rules-new'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="rules-new-edit__header">
		<h1>{m.rules_new_edit_template()}</h1>
		<CwChip
			label={`${m.rules_new_template_id()}: ${template.id}`}
			tone="info"
			variant="outline"
			size="sm"
		/>
	</div>

	<RuleTemplateForm mode="edit" {devices} initialTemplate={template} />
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
