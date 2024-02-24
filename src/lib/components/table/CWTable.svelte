<script lang="ts">
	import { mdiArrowRight } from '@mdi/js';
	import { filter } from 'd3';
	import { createEventDispatcher } from 'svelte';
	import { Button, Icon, Pagination, paginationStore } from 'svelte-ux';
	export let rows: [] = [];

	const dispatch = createEventDispatcher();
	const onHover = (row) => {
		dispatch('Hover', {
			row: row
		});
	};

	const pagination = paginationStore();
	pagination.setTotal(100);

	// Extract headers from the first row (if it exists)
	let headers = rows.length > 0 ? Object.keys(rows[0]) : [];
</script>

<table class={`${$$props.class}`}>
	<thead>
		<tr>
			{#each headers as header}
				<th scope="col">{header}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row}
			<tr on:mousemove={(e) => onHover(row)}>
				{#each Object.keys(row) as key}
					<td>
						{#if typeof row[key] === 'object' && row[key].type === 'button'}
							<Button variant="fill" icon={mdiArrowRight} on:click={row[key].click}>{row[key].text}</Button>
						{:else}
							{row[key]}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
<Pagination
	{pagination}
	show={['firstPage', 'prevPage', 'pagination', 'nextPage', 'lastPage']}
	classes={{ pagination: 'flex-1 text-center' }}
/>

<style>
	table {
		table-layout: fixed;
		border: 1px solid #ccc;
		border-collapse: separate;
		border-radius: 20px;
		margin: 0;
		padding: 0;
		width: 100%;
		table-layout: fixed;
	}

	table caption {
		font-size: 1.5em;
		margin: 0.5em 0 0.75em;
	}

	table tr {
		background-color: #f8f8f8;
		border: 1px solid #ddd;
		padding: 0.35em;
	}

	table tr:hover {
		background-color: #f8fccc;
	}

	table th,
	table td {
		padding: 0.625em;
		text-align: center;
	}

	table th {
		font-size: 0.85em;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	table th :first {
		border-radius: 20px;
	}

	@media screen and (max-width: 600px) {
		table {
			border-collapse: separate;
			margin: 0;
			padding: 0;
			width: 100%;
			table-layout: fixed;
		}

		thead tr th {
			background-color: #f6f5fd; /* Header background color */
			color: #6058e8; /* Header text color */
		}

		table caption {
			font-size: 1.3em;
		}

		table thead {
			border: none;
			clip: rect(0 0 0 0);
			height: 1px;
			margin: -1px;
			overflow: hidden;
			padding: 0;
			position: absolute;
			width: 1px;
			border-radius: 20px 20px 0 0; /* Adjusted to only top corners */
		}
		table tr {
			/* border-bottom: 3px solid #ddd; */
			display: block;
			margin-bottom: 0.625em;
		}

		table td {
			/* border-bottom: 1px solid #ddd; */
			display: block;
			font-size: 0.8em;
			text-align: right;
		}

		table td::before {
			content: attr(data-label);
			float: left;
			font-weight: bold;
			text-transform: uppercase;
		}

		table td:last-child {
			border-bottom: 0;
		}
	}

	.break:before {
		word-wrap: break-word;
	}
</style>
