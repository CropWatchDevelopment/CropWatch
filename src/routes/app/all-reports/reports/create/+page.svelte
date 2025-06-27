<script lang="ts">
	import { success, error as errorToast } from '$lib/stores/toast.svelte';
	let points = $state<any[]>([]);
	let interval = $state(60);
	let averaged = $state(false);
	let weekly = $state(false);
	let monthly = $state(false);

	function addPoint() {
		points.push({ name: '', min: null, max: null, color: '#000000' });
	}
	function removePoint(i: number) {
		points.splice(i, 1);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		formData.set(
			'template',
			JSON.stringify({ alertPoints: points, interval, averaged, weekly, monthly })
		);
		const res = await fetch('?/createReport', { method: 'POST', body: formData });
		const result = await res.json();
		if (result.success) {
			success('Report created');
			form.reset();
		} else {
			errorToast(result.error || 'Failed to create report');
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-xl font-semibold">Create Report</h1>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit(e);
		}}
		class="flex flex-col gap-2"
	>
		<label>
			Name
			<input name="name" class="rounded border p-1" required />
		</label>
		{#each points as p, i}
			<div class="flex items-center gap-2">
				<input type="text" bind:value={p.name} placeholder="Name" class="rounded border p-1" />
				<input type="number" bind:value={p.min} placeholder="Min" class="w-20 rounded border p-1" />
				<input type="number" bind:value={p.max} placeholder="Max" class="w-20 rounded border p-1" />
				<input type="color" bind:value={p.color} />
				<button type="button" class="text-red-600" onclick={() => removePoint(i)}>X</button>
			</div>
		{/each}
		<button type="button" onclick={addPoint} class="underline">Add Point</button>
		<label>
			Interval (minutes)
			<input type="number" bind:value={interval} class="rounded border p-1" />
		</label>
		<label class="flex gap-2"
			><input type="checkbox" bind:checked={averaged} /> Average values</label
		>
		<label class="flex gap-2"><input type="checkbox" bind:checked={weekly} /> Send weekly</label>
		<label class="flex gap-2"><input type="checkbox" bind:checked={monthly} /> Send monthly</label>
		<button class="btn" type="submit">Create</button>
	</form>
</div>
