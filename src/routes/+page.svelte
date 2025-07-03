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

	// Toast demo functions
	function showSuccessToast() {
		success('Success! Operation completed successfully.');
	}

	function showErrorToast() {
		error('Error! Something went wrong.');
	}

	function showWarningToast() {
		warning('Warning! Please be careful with this action.');
	}

	function showInfoToast() {
		info('Info: This is an informational message.');
	}

	function showNeutralToast() {
		neutral('This is a neutral notification.');
	}

	function showCustomToast() {
		success('Custom toast with longer timeout!', { timeout: 10000 });
	}

	// Code examples as strings to avoid syntax issues
	const importExample =
		"import { success, error, warning, info, neutral } from '$lib/stores/toast';";
	const usageExample = `// Basic usage
success('Success message');
error('Error message');
warning('Warning message');
info('Info message');
neutral('Neutral message');

// With custom options
success('Custom message', { 
  timeout: 8000,     // Duration in ms (default: 5000)
  dismissible: true  // Allow manual dismissal (default: true)
});`;

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
	<h1 class="mb-6 text-3xl font-bold">Toast Notification Demo</h1>
	<button
		onclick={() => goto('/app/dashboard')}
		class="bg-info rounded-md px-4 py-2 text-white transition-opacity hover:opacity-90"
	>
		Goto Dashboard
	</button>

	<div class="bg-card-light dark:bg-card-dark rounded-lg p-6 shadow-md">
		<p class="mb-4">Click the buttons below to see different types of toast notifications:</p>

		<div class="flex flex-wrap gap-3">
			<button
				onclick={showSuccessToast}
				class="bg-success rounded-md px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Success Toast
			</button>

			<button
				onclick={showErrorToast}
				class="bg-error rounded-md px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Error Toast
			</button>

			<button
				onclick={showWarningToast}
				class="rounded-md bg-amber-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Warning Toast
			</button>

			<button
				onclick={showInfoToast}
				class="rounded-md bg-blue-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Info Toast
			</button>

			<button
				onclick={showNeutralToast}
				class="rounded-md bg-gray-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Neutral Toast
			</button>

			<button
				onclick={showCustomToast}
				class="rounded-md bg-purple-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
			>
				Custom Toast (10s)
			</button>
		</div>
	</div>

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

<section>
	<Vpd
		lineData={[
			{ date: '2023-01-01', temp: 20, humidity: 60 },
			{ date: '2023-01-02', temp: 22, humidity: 65 },
			{ date: '2023-01-03', temp: 18, humidity: 55 },
			{ date: '2023-01-04', temp: 25, humidity: 70 }
		]}
	/>
</section>

<style>
	pre {
		font-family: monospace;
		font-size: 0.9rem;
		line-height: 1.5;
	}
</style>
