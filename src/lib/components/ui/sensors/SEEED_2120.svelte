<script lang="ts">
	import moment from 'moment';
	import { _ } from 'svelte-i18n';
	import { Duration } from 'svelte-ux';

	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';

	export let data;
	export let sensorName = 'NS';

	let lastSeen = data.at(0).created_at;
	let isActiveRecently = moment().diff(moment(lastSeen), 'minutes') < 31;
</script>

<div class="m-4">
	<div class="flex flex-row">
		<img
			src={isActiveRecently ? ActiveImage : inActiveImage}
			alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
			class="w-14 h-14 mr-4"
		/>
		<div class="flex flex-col">
			<p class="text-surface-100 text-4xl">{sensorName}</p>
			<p class="text-slate-500">
				{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
				{$_('ago')}
			</p>
		</div>
	</div>
</div>
