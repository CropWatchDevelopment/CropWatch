<script lang="ts">
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import type { AirRow } from '../interfaces/AirRow.interface';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import { formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';

	let { row }: { row: AirRow } = $props();
	let open = $state(false);
</script>

<CwButton variant="secondary" size="sm" onclick={() => (open = true)}>
	<img src={EYE_ICON} alt={m.display_view_notes()} />
</CwButton>

<CwDialog
	{open}
	onclose={() => (open = false)}
	title={m.display_view_notes_title({ createdAt: formatDateTime(row.created_at) })}
>
	{#each row.cw_air_annotations as note (note.id)}
		<p>{formatDateTime(note.created_at)} - {note.note}</p>
	{/each}
	{#snippet actions()}
		<CwButton variant="secondary" onclick={() => (open = false)}>{m.action_cancel()}</CwButton>
	{/snippet}
</CwDialog>
