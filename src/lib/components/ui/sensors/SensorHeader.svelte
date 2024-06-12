<script lang="ts">
	import { Duration } from "svelte-ux";


	import Back from "../Back.svelte";
	import EditSensorNameDialog from "../EditSensorNameDialog.svelte";
    import { _ } from 'svelte-i18n';
    
    export let sensorName: string = 'NS';
    export let dev_eui: string = 'NS';
    export let lastSeen: Date = new Date();

</script>
<div class="flex flex-row">
	<div class="flex flex-col w-full">
		<div class="flex flex-row text-neutral-content items-center">
			<Back>
				<span class="w-full inline-block flex-nowrap">
					{sensorName}
				</span>
				<EditSensorNameDialog {dev_eui} bind:currentSensorName={sensorName} />
			</Back>
		</div>
		<p class="text-slate-500">
			{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
			{$_('ago')}
		</p>
	</div>
</div>
