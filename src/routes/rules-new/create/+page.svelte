<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppPage } from '$lib/components/layout';
	import type { DeviceDto, RuleActionTypeDto } from '$lib/api/api.dtos';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import RuleTemplateForm from '../RuleTemplateForm.svelte';

	let { data }: PageProps = $props();
	const devices = (() => data.devices as DeviceDto[])();
	const actionTypes = (() => data.actionTypes as RuleActionTypeDto[])();
</script>

<svelte:head>
	<title>{m.rules_new_create_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/rules-new'))}>
		&larr; {m.action_back()}
	</CwButton>

	<div class="rules-new-create__header">
		<h1>{m.rules_new_create_template()}</h1>
	</div>

	<RuleTemplateForm
		mode="create"
		{devices}
		{actionTypes}
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
