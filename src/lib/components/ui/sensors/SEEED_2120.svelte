<script lang="ts">
	import moment from 'moment';
	import { _ } from 'svelte-i18n';
	import { Duration } from 'svelte-ux';

	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';

	export let data;
	export let sensorName = 'NS';

	let dev_eui = data.at(0).dev_eui;
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
			<div class="flex flex-row text-neutral-content">
				<p class="text-surface-100 text-4xl mr-2">{sensorName}</p>
				<EditSensorNameDialog {dev_eui} bind:currentSensorName={sensorName} />
			</div>
			<p class="text-slate-500">
				{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
				{$_('ago')}
			</p>
		</div>
	</div>
</div>
