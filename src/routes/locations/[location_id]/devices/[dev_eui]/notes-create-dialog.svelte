<script lang="ts">
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import type { TelemetryRow } from '$lib/interfaces/telemetryRow';

	let { row, dev_eui }: { row: TelemetryRow, dev_eui: string } = $props();
	let open = $state(false);
	let noteText = $state('');

	async function handleSaveNote() {
		const formData = new FormData();
		formData.append('note', noteText);
		formData.append('created_at', row.created_at);
		formData.append('dev_eui', dev_eui);

		const result = await fetch('?/saveDataNote', {
			method: 'POST',
			body: formData
		});
		open = false;
		noteText = '';
		return result.ok;
	}


</script>

<CwButton variant="info" onclick={() => (open = true)}>Add a Note</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={`Add Note for ${new Date(row.created_at).toISOString()}`}
>
	{#snippet children()}
		<p style="margin-bottom: 1rem;">
			Add a note for the telemetry entry at {new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 19)}
			with temperature {row.temperature_c}°C.
		</p>
		<textarea
			class="rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
			placeholder="Enter your note here..."
			style="width: 100%; height: 150px; padding: 0.5rem; font-size: 1rem;"
			bind:value={noteText}
		></textarea>
	{/snippet}
	{#snippet actions()}
		<CwButton variant="primary" onclick={() => handleSaveNote()}>Save Note</CwButton>
		<CwButton variant="secondary" onclick={() => (open = false)}>Cancel</CwButton>
	{/snippet}
</CwDialog>

<style>
    /* Good darkmode style for the text area */
    textarea {
        background-color: #1e1e1e;
        color: #ffffff;
        border: 1px solid #333333;
    }
    textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
    }
</style>
