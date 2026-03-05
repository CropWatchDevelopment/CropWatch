<script lang="ts">
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import type { TelemetryRow } from '$lib/interfaces/telemetryRow';

	let { row }: { row: TelemetryRow } = $props();
    let open = $state(false);

</script>

<CwButton variant="secondary" onclick={() => (open = true)}>View Notes</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={`View Notes for ${new Date(row.created_at).toISOString()}`}
>
	{#snippet children()}
		{#each row.notes as note}
            <p>{new Date(note.created_at).toISOString()} - {note.note}</p>
        {/each}
	{/snippet}
	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>Cancel</CwButton>
	{/snippet}
</CwDialog>
