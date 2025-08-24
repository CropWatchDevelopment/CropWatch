<script lang="ts">
	import { formatDuration, DurationUnits } from '$lib/utilities/duration';
	export { DurationUnits };
	let {
		start,
		totalUnits = 2,
		minUnits = DurationUnits.Second
	} = $props<{
		start: string | Date;
		totalUnits?: number;
		minUnits?: DurationUnits;
	}>();
	const value = $derived(formatDuration(start, { totalUnits, minUnits }));
</script>

<span>{value}</span>
