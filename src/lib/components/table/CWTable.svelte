<script lang="ts">
	import { mdiArrowRight } from '@mdi/js';
	import { createEventDispatcher } from 'svelte';
	import { Button, Table, Icon, Pagination, paginationStore, Paginate, tableOrderStore } from 'svelte-ux';

	export let rows: [] = [];

	const dispatch = createEventDispatcher();
	const onHover = (row) => {
		dispatch('Hover', {
			row: row
		});
	};

	const pagination = paginationStore();
	pagination.setTotal(100);

	const order = tableOrderStore({ initialBy: 'calories', initialDirection: 'desc' });

	const data = [
    { id: 1, name: 'Cupcake', calories: 305, fat: 3.7, carbs: 67, protein: 4.3 },
    { id: 2, name: 'Donut', calories: 452, fat: 25.0, carbs: 51, protein: 4.9 },
    { id: 3, name: 'Eclair', calories: 262, fat: 16.0, carbs: 24, protein: 6.0 },
    { id: 4, name: 'Frozen yogurt', calories: 159, fat: 6.0, carbs: 24, protein: 4.0 },
    { id: 5, name: 'Gingerbread', calories: 356, fat: 16.0, carbs: 49, protein: 3.9 },
    { id: 6, name: 'Honeycomb', calories: 408, fat: 3.2, carbs: 87, protein: 6.5 },
    { id: 7, name: 'Ice cream sandwich', calories: 237, fat: 9.0, carbs: 37, protein: 4.3 },
    { id: 8, name: 'Jelly Bean', calories: 375, fat: 0.0, carbs: 94, protein: 0.0 },
    { id: 9, name: 'KitKat', calories: 518, fat: 26.0, carbs: 65, protein: 7.0 },
    { id: 10, name: 'Lollipop', calories: 392, fat: 0.2, carbs: 98, protein: 0.0 },
    { id: 11, name: 'Marshmallow', calories: 318, fat: 0.0, carbs: 81, protein: 2.0 },
    { id: 12, name: 'Nougat', calories: 360, fat: 19.0, carbs: 9, protein: 37.0 },
    { id: 13, name: 'Oreo', calories: 437, fat: 18.0, carbs: 63, protein: 4.0 },
  ];
</script>

<!-- <table class={`${$$props.class}`}>
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
</table> -->

<Paginate
  items={data.sort($order.handler)}
  perPage={5}
  let:pageItems
  let:pagination
>
  <Table
    data={pageItems}
    columns={[
      {
        name: "name",
        align: "left",
      },
      {
        name: "calories",
        align: "right",
        format: "integer",
      },
      {
        name: "fat",
        align: "right",
        format: "integer",
      },
      {
        name: "carbs",
        align: "right",
        format: "integer",
      },
      {
        name: "protein",
        align: "right",
        format: "integer",
      },
    ]}
    orderBy={$order.by}
    orderDirection={$order.direction}
    on:headerClick={(e) => {
      //Switch back to page 1 when sorting
      pagination.setPage(1);
      order.onHeaderClick(e);
    }}
  />
  <Pagination
    {pagination}
    perPageOptions={[5, 10, 25, 100]}
    show={["perPage", "pagination", "prevPage", "nextPage"]}
    classes={{
      root: "border-t py-1 mt-2",
      perPage: "flex-1 text-right",
      pagination: "px-8",
    }}
  />
</Paginate>

<!-- <style>
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
</style> -->
