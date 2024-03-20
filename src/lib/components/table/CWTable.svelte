<script lang="ts">
	import { goto } from '$app/navigation';
	import { DeviceIntType } from '$lib/helpers/DeviceTypeToName';
	import { mdiDevices, mdiEye, mdiLock, mdiMapMarker } from '@mdi/js';
	import { createEventDispatcher } from 'svelte';
	import { Button, CopyButton, Duration, DurationUnits, Icon, Tooltip } from 'svelte-ux';

	// Accept any array of objects as generic data
	export let data: Array<Record<string, any>> = [];
	console.log(data);

	// Ensure headers are generated from the keys of the objects. We use a reactive statement to update headers if data changes.
	$: headers =
		data.length > 0
			? Object.keys(data[0]).filter((key) => key !== 'component' && key !== 'Location')
			: [];

	const dispatch = createEventDispatcher();

	function onHover(item) {
		dispatch('hover', { item });
	}
</script>

<table class={$$props.class}>
	<thead>
		<tr>
			{#each headers as header}
				{#if header != 'model' && header != 'Location'}
					<th scope="col">{header}</th>
				{/if}
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each data as row, rowIndex}
			<tr on:mousemove={() => onHover(row)}>
				{#each headers as header}
					{#if header != 'model' && header != 'Location'}
						{#if header == 'lastSeen'}
							<td data-label="Last Seen">
								<Duration
									start={new Date(row.lastSeen)}
									totalUnits={2}
									minUnits={DurationUnits.Second}
								/>
							</td>
						{:else if header == 'locationName'}
							<td data-label="Location Name">
								{row.locationName}
							</td>
						{:else if header == 'devEui'}
							<td data-label="DEV Eui">
								<Tooltip title="Copy Dev EUI" }>
									{row[header]}<CopyButton value={row['devEui']} size="sm" />
								</Tooltip>
							</td>
						{:else if header == 'url'}
							<td class="flex flex-row gap-2 justify-center" data-label="Actions">
								{#if row.Location?.cw_locations?.location_id}
									<Tooltip title="View device details">
										<Button
											variant="outline"
											icon={mdiDevices}
											on:click={() =>
												goto(
													`/app/locations/${row.Location?.cw_locations?.location_id}/device-type/${DeviceIntType(row.model)}/${row.devEui}`
												)}
										/>
									</Tooltip>

									<Tooltip title="View Location of device">
										<Button
											variant="outline"
											icon={mdiMapMarker}
											on:click={() =>
												goto(`/app/locations/${row.Location?.cw_locations?.location_id}/`)}
										/>
									</Tooltip>
								{:else}
									<Tooltip title="Not available or no permission">
										<Icon data={mdiLock} />
									</Tooltip>
								{/if}
							</td>
						{:else}
							<td data-label={header}>
								{row[header]}
							</td>
						{/if}
					{/if}
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		table-layout: fixed;
		border: 1px solid #ccc;
		border-collapse: separate;
		border-radius: 20px;
		margin: 0;
		padding: 0;
		/* width: 100%; */
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

	.break:before {
		word-wrap: break-word;
	}
</style>
