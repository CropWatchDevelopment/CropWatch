<script lang="ts">
	import { CopyButton, Duration, Tooltip } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import moment from 'moment';
	import { appStore } from '$lib/stores/app.store';

	export let sensorName: string = 'NS';
	export let lastSeen: Date;
	export let upload_interval: number = 0;
	// export let isActiveRecently: boolean =
	// 	Math.abs(moment().diff(moment(new Date(lastSeen)).add(upload_interval, 'minutes'), 'minutes')) <
	// 	upload_interval;

	$: isActiveRecently =
		Math.abs(moment().diff(moment(new Date(lastSeen)).add(upload_interval, 'minutes'), 'minutes')) <
		upload_interval;
</script>

<div class="flex flex-row">
	<div class="flex w-full flex-col">
		<div class="text-surface-900 flex flex-row items-center">
			<Tooltip title={isActiveRecently ? 'Active' : 'Inactive'}>
				<img
					src={isActiveRecently ? ActiveImage : inActiveImage}
					alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
					class="mr-4 h-14 w-14"
				/>
			</Tooltip>
			<span class="inline-block w-full flex-nowrap text-xl">
				{sensorName}<CopyButton value={sensorName} />
				<p class="text-surface-900">
					{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
					{$_('ago')}
				</p>
			</span>
		</div>
	</div>
</div>

{#if $appStore.debugMode}
	<div class="flex flex-col">
		<pre>
isActiveRecently: {isActiveRecently}
lastSeen: {JSON.stringify(lastSeen)}
upload_interval: {upload_interval}
diff: {Math.abs(
				moment().diff(moment(new Date(lastSeen)).add(upload_interval, 'minutes'), 'minutes')
			)}
is {Math.abs(
				moment().diff(moment(new Date(lastSeen)).add(upload_interval, 'minutes'), 'minutes')
			)} less than {upload_interval}
</pre>
	</div>
{/if}
