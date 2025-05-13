<script lang="ts">
	let { onSelect } = $props();

	// Make `point` reactive
	let point = $state({
		id: 5,
		name: 'Warning High',
		operator: '>',
		value: 30,
		min: null,
		max: null,
		color: '#FFA500'
	});

	function handleSave() {
        if (point.min != null && point.max != null) {
            point.operator = undefined;
            point.value = null;
        }
		onSelect({
			id: point.id,
			name: point.name,
			operator: point.operator,
			value: point.value,
			min: point.min,
			max: point.max,
			color: point.color
		});
	}
</script>

<!-- Bind inputs to the reactive `point` object -->
<input type="text" bind:value={point.name} placeholder="Point Name" />
{#if point.operator != undefined}
	<input type="number" bind:value={point.value} placeholder="Value" />
{/if}
{#if point.operator === undefined}
	<input type="number" bind:value={point.min} placeholder="Minimum Value" />
	<input type="number" bind:value={point.max} placeholder="Maximum Value" />
{/if}
<select bind:value={point.operator}>
	<option value={undefined}>empty</option>
	<option value=">">&gt;</option>
	<option value="<">&lt;</option>
	<option value="=">=</option>
</select>
<input type="color" bind:value={point.color} />
<button onclick={handleSave}>Save</button>
