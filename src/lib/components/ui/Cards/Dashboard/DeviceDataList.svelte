<script lang="ts">
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Duration, DurationUnits } from 'svelte-ux';
	// import { convertObject } from './utilities/ConvertSensorDataObject';
	// import { nameToNotation } from './utilities/NameToNotation';
	// import { nameToEmoji } from './utilities/NameToEmoji';
	import { _ } from 'svelte-i18n';
	import moment from 'moment';
	import { convertObject } from '../../utilities/ConvertSensorDataObject';
	import { nameToEmoji } from '../../utilities/NameToEmoji';
	import { nameToNotation } from '../../utilities/NameToNotation';

	export let data: any;
    let isOld = moment(data.created_at).diff(moment(), 'minutes') > 120;
</script>

<div class="mr-2 border-l-8 {isOld ? 'border-l-red-500' : 'border-l-green-500'}">
	<div class="flex px-3">
		<h3 class="mb-2 basis-1/3 text-lg font-medium">
			{$_('dashboardCard.details')}
		</h3>
	</div>
	{#each Object.keys(convertObject(data)) as dataPointKey, index}
		{#if data[dataPointKey] !== null}
			<div class="py-1">
				<div class="flex">
					<p class="text-base">{nameToEmoji(dataPointKey)}</p>
					<p class="ml-2 text-right">{$_(dataPointKey)}</p>
					<span class="flex-grow" />
					<p class="flex flex-row align-bottom text-base">
						{#if dataPointKey === 'created_at'}
							<Duration
								start={data[dataPointKey]}
								totalUnits={2}
								minUnits={DurationUnits.Second}
							/>&nbsp {$_('ago')}
						{:else if data[dataPointKey] !== null}
							{data[dataPointKey] ? data[dataPointKey].toLocaleString() : 'N/A'}
							<small class="text-secondary"><sup>{nameToNotation(dataPointKey)}</sup></small>
						{/if}
					</p>
				</div>
				{#if Object.keys(convertObject(data)).length - 1 !== index}
					<div class="border-b border-[#7d7d81] px-3 pt-2"></div>
				{:else}
					<div class="px-3 pt-2"></div>
				{/if}
			</div>
		{/if}
	{/each}
</div>
