<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button, Paginate, Pagination, paginationStore } from 'svelte-ux';
	import DarkCard from './DarkCard.svelte';
	import DarkCard2 from './DarkCard2.svelte';
	export let data: any[] = [];
	export let title: string = '';

	const pagination = paginationStore();
	pagination.setTotal(data.length);
	pagination.setPerPage(10);
</script>

<DarkCard2>
	{#if data.length > 0}
		<table class="mb-2 text-black">
			<caption>{title}</caption>
			<thead>
				<tr>
					{#each Object.keys(data[0]) as key}
						<th scope="col">{key}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.slice($pagination.from, $pagination.to) as row}
					<tr>
						{#each Object.values(row) as value, index}
							<td data-label={Object.keys(row)[index]}>{value}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		<Pagination
			{pagination}
			show={['actions', 'perPage', 'pagination', 'prevPage', 'nextPage']}
			classes={{ perPage: 'flex-1 text-right', pagination: 'px-8' }}
		>
			<div slot="actions">
				<Button variant="fill" color="primary">Click me</Button>
			</div>
		</Pagination>
	{:else}
		<p>{$_('no_data_available')}</p>
	{/if}
</DarkCard2>

<style>
	table {
		border: 1px solid #ccc;
		border-collapse: collapse;
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

	@media screen and (max-width: 600px) {
		table {
			border: 0;
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
		}

		table tr {
			border-bottom: 3px solid #ddd;
			display: block;
			margin-bottom: 0.625em;
		}

		table td {
			border-bottom: 1px solid #ddd;
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

	/* general styling */
	body {
		font-family: 'Open Sans', sans-serif;
		line-height: 1.25;
	}
</style>
