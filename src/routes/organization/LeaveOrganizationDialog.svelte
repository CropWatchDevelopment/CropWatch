<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';

	let { open = $bindable(false) } = $props();

	const toast = useCwToast();
	let leaving = $state(false);

	async function confirmLeave() {
		if (leaving) return;
		leaving = true;
		try {
			const response = await fetch('?/leave', { method: 'POST', body: new FormData() });
			const result = deserialize(await response.text());
			if (result.type === 'success') {
				toast.add({ tone: 'success', message: m.organization_left() });
				open = false;
				await goto(resolve('/'), { invalidateAll: true });
				return;
			}
			await applyAction(result);
			if (result.type === 'failure' && typeof result.data?.error === 'string') {
				toast.add({ tone: 'danger', message: result.data.error });
			}
		} catch {
			toast.add({ tone: 'danger', message: m.generic_error() });
		} finally {
			leaving = false;
		}
	}
</script>

<CwDialog bind:open title={m.organization_leave_title()}>
	<p>{m.organization_leave_body()}</p>

	{#snippet actions()}
		<CwButton variant="ghost" onclick={() => (open = false)}>
			{m.action_cancel()}
		</CwButton>
		<CwButton variant="danger" loading={leaving} onclick={confirmLeave}>
			{m.organization_leave()}
		</CwButton>
	{/snippet}
</CwDialog>
