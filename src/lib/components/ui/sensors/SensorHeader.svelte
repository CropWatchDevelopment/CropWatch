<script lang="ts">
	import { Duration } from 'svelte-ux';

	import Back from '../Back.svelte';
	import { _ } from 'svelte-i18n';

	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';

	export let sensorName: string = 'NS';
	export let lastSeen: Date = new Date();
	export let isActiveRecently: boolean = true;
</script>

<div class="flex flex-row">
	<div class="flex flex-col w-full">
		<div class="flex flex-row text-neutral-content items-center">
			<Back>
				<img
					src={isActiveRecently ? ActiveImage : inActiveImage}
					alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
					class="w-14 h-14 mr-4"
				/>
				<span class="w-full inline-block flex-nowrap text-xl">
					{sensorName}
					<p class="text-slate-300">
						{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
						{$_('ago')}
					</p>
				</span>
			</Back>
		</div>
	</div>
</div>
