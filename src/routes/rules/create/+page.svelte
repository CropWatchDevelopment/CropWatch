<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import RuleTemplateForm from '../RuleTemplateForm.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.rules_new_create_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton id="rule-create-back-button" variant="secondary" size="sm" onclick={() => goto(resolve('/rules'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="rules-new-create__header">
		<h1>{m.rules_new_create_template()}</h1>
	</div>

	<RuleTemplateForm
		mode="create"
		context={data.context}
		authToken={data.authToken}
		preselectedDevEui={data.devEui}
	/>
</AppPage>

<style>
	.rules-new-create__header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
		font-weight: var(--cw-font-semibold);
	}
</style>
