<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Vpd from '$lib/components/charts/Vpd.svelte';
	import NewPoint from '$lib/components/Reports/NewPoint.svelte';
	import NumberLine from '$lib/components/Reports/NumberLine.svelte';
	import { success, error, warning, info, neutral } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';

	// Define the AlertPoint type locally to match the one in NumberLine.svelte
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

<div class="container mx-auto p-8">
	<button
		onclick={() => goto('/app/dashboard')}
		class="bg-info rounded-md px-4 py-2 text-white transition-opacity hover:opacity-90"
	>
		Goto Dashboard
	</button>

	<div class="mt-8">
		<h2 class="mb-4 text-xl font-bold">How to Use Toast Notifications</h2>
		<div class="bg-card-light dark:bg-card-dark rounded-lg p-6 shadow-md">
			<p class="mb-3">Import the toast store in your Svelte component:</p>
			<pre
				class="mb-4 overflow-x-auto rounded bg-gray-100 p-3 dark:bg-gray-800">{importExample}</pre>

			<p class="mb-3">Then use any of these methods:</p>
			<pre class="overflow-x-auto rounded bg-gray-100 p-3 dark:bg-gray-800">{usageExample}</pre>
		</div>
	</div>

	<div class="mt-8">
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
	</div>
</div>
