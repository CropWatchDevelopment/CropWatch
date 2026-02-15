<script lang="ts">
	import CWDialog from '$lib/components/CWDialog.svelte';
	import CWDateRangePicker, { type DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import CWButton from '$lib/components/CWButton.svelte';

	let {
		open = $bindable(false),
		lineDateRange = $bindable<DateRangeValue>(),
		onDownload,
		onCancel
	}: {
		open?: boolean;
		lineDateRange?: DateRangeValue;
		onDownload: () => void;
		onCancel: () => void;
	} = $props();
</script>

<CWDialog bind:open title="Download Device Data">
	<label class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200">
		<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
		<CWDateRangePicker rangeType="day" maxDate={new Date()} bind:value={lineDateRange} />
	</label>
	<p class="mt-4 text-xs text-slate-400">CSV export uses Asia/Tokyo for local timestamps.</p>
	<div class="mt-6 flex justify-end gap-4">
		<CWButton variant="secondary" onclick={onCancel}>Cancel</CWButton>
		<CWButton onclick={onDownload}>Download</CWButton>
	</div>
</CWDialog>
