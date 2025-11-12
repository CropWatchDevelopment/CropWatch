<script lang="ts">
	type Operator = '>' | '<' | '=' | null;

	let { onSelect } = $props<{
		onSelect: (point: {
			id: number;
			name: string;
			operator: Operator;
			value: number | null;
			min: number | null;
			max: number | null;
			color: string;
		}) => void;
	}>();

	// Make `point` reactive
	let point = $state({
		id: 5,
		name: 'Warning High',
		operator: '>' as Operator,
		value: 30 as number | null,
		min: null as number | null,
		max: null as number | null,
		color: '#FFA500'
	});

	function handleSave() {
		if (point.min != null && point.max != null) {
			point.operator = null;
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

	function handleOperatorChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		point.operator = value === '' ? null : (value as Operator);
		if (point.operator === null) {
			point.value = null;
		} else {
			point.min = null;
			point.max = null;
		}
	}
</script>

<!-- Bind inputs to the reactive `point` object -->
<input type="text" bind:value={point.name} placeholder="Point Name" />
{#if point.operator !== null}
	<input type="number" bind:value={point.value} placeholder="Value" />
{/if}
{#if point.operator === null}
	<input type="number" bind:value={point.min} placeholder="Minimum Value" />
	<input type="number" bind:value={point.max} placeholder="Maximum Value" />
{/if}
<select value={point.operator ?? ''} onchange={handleOperatorChange}>
	<option value="">{'Range'}</option>
	<option value=">">&gt;</option>
	<option value="<">&lt;</option>
	<option value="=">=</option>
</select>
<input type="color" bind:value={point.color} />
<button onclick={handleSave}>Save</button>
