<script lang="ts">
	import { browser } from '$app/environment';
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

	let now = $state(Date.now());

	function computeUpdateInterval(unit: DurationUnits): number {
		switch (unit) {
			case DurationUnits.Day:
				return 60 * 60 * 1000; // hourly updates
			case DurationUnits.Hour:
				return 60 * 1000; // every minute
			case DurationUnits.Minute:
				return 15 * 1000; // four times per minute
			case DurationUnits.Second:
			default:
				return 1000; // every second
		}
	}

	const updateIntervalMs = $derived(computeUpdateInterval(minUnits));

	$effect(() => {
		if (!browser) return;
		const intervalId = window.setInterval(() => {
			now = Date.now();
		}, updateIntervalMs);
		return () => window.clearInterval(intervalId);
	});

	const value = $derived(formatDuration(start, { totalUnits, minUnits, now }));
</script>

<span>{value}</span>
