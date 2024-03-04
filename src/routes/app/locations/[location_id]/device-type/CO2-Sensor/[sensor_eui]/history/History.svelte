<script lang="ts">
	import { sensorDataState } from '$lib/stores/CW-SS-TMEPNPK';
	import { mdiCalendarRange, mdiDotsVertical, mdiDownload, mdiHistory } from '@mdi/js';
	import { Avatar, Button, Card, DateRangeField, Header, Icon, ListItem, Menu, MenuItem, PeriodType, Toggle } from 'svelte-ux';
	import type { DateRange } from 'svelte-ux/utils/dateRange';

	let selectedDateRange: DateRange = {
		from: new Date(),
		to: new Date(),
		periodType: PeriodType.Day
	};
    $: data = $sensorDataState;
</script>

<div class="m-4">
	<h2>History list</h2>

	<ol class="mt-2">
		<DateRangeField bind:value={selectedDateRange} stepper icon={mdiCalendarRange} />

        <ol>
            {#each data as uplink}
                <ListItem title={uplink.soil_temperatureC} subheading="Subheading" />
            {/each}
        </ol>
	</ol>
</div>