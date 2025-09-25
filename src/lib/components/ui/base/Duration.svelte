<script lang="ts">
	import { formatDuration, DurationUnits } from '$lib/utilities/duration';
	export { DurationUnits };

	let {
		start,
		totalUnits = 2,
		minUnits = DurationUnits.Second
	} = $props<{
		start: string | Date; // ISO string or Date
		totalUnits?: number;
		minUnits?: DurationUnits;
	}>();

	// --- helpers ---
	function toDate(v: string | Date): Date {
		const d = v instanceof Date ? v : new Date(v);
		return isNaN(d.getTime()) ? new Date() : d;
	}

	// Ticks every second so value re-derives
	let now = $state(new Date());

	// Normalize the incoming start prop
	const startedAt = $derived(toDate(start));

	// Interval ticker (1s)
	$effect(() => {
		const id = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(id);
	});

	// When start changes (e.g., realtime update), show 0 immediately,
	// then the ticker will continue from there on the next second.
	$effect(() => {
		// Force an immediate render at t=0
		now = new Date(startedAt.getTime());
	});

	// Derive the formatted duration. We touch `now` to make this recompute
	// every second even if formatDuration only uses `start` internally.
	const value = $derived.by(() => {
		// establish dependency on 'now' without changing the call signature
		void now;
		return formatDuration(startedAt, { totalUnits, minUnits });
	});
</script>

<span>{value}</span>
