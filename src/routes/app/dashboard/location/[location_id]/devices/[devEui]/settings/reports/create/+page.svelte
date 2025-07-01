<script lang="ts">
	import NewPoint from '$lib/components/Reports/NewPoint.svelte';
	import NumberLine from '$lib/components/Reports/NumberLine.svelte';
	import { error, success } from '$lib/stores/toast.svelte';

	type AlertPoint = {
		id: number;
		name: string;
		operator?: '>' | '<' | '=';
		value?: number;
		min?: number;
		max?: number;
		color: string;
	};
	let showDataPicker = $state(false);
	let points: AlertPoint[] = $state([
		// // Way 1: operator >
		// { id: 1, name: 'Warning High', operator: '>', value: 30, color: '#FFA500' },
		// // Way 1: operator <
		// { id: 2, name: 'Too Cold', operator: '<', value: 0, color: '#1E90FF' },
		// // Way 1: operator =
		// { id: 3, name: 'Freezing', operator: '=', value: 2.5, color: '#0000FF' },
		// // Way 2: explicit [min, max]
		// { id: 4, name: 'Optimal', min: 5, max: 25, color: '#32CD32' }
	]);
</script>

<section class="flex flex-col gap-4">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h2 class="mb-1 text-2xl font-semibold">Reports</h2>
			<p class="text-sm text-neutral-100">Manage the device information.</p>
		</div>
	</header>

	<h2 class="mb-4 text-xl font-bold">Temperature Range Visualization</h2>
	<div class="bg-card-light dark:bg-card-dark rounded-lg p-6 shadow-md">
		<!-- Only pass the points prop -->
		<NumberLine {points}>
			<button
				onclick={() => (showDataPicker = !showDataPicker)}
				class="rounded bg-blue-500 px-2 py-1 text-white"
			>
				Add Point
			</button>
		</NumberLine>
		{#if showDataPicker}
			<NewPoint
				onSelect={(e) => {
					const itemLength = points.length;
					points.push({
						id: points.length + 1,
						name: e.name,
						operator: e.operator,
						value: e.value,
						min: e.min,
						max: e.max,
						color: e.color
					});
					showDataPicker = false;
					if (itemLength !== points.length) {
						success('Point added successfully!');
					} else {
						error('Failed to add point.');
					}
				}}
			/>
		{/if}
	</div>
</section>
