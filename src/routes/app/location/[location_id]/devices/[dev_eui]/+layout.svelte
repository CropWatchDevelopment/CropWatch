<script lang="ts">
	import { page } from '$app/stores';
	import CsvDownloadDialog from '$lib/components/dialogs/CsvDownloadDialog.svelte';
	import DataDateRangeSelectDialog from '$lib/components/dialogs/DataDateRangeSelectDialog.svelte';
	import ReportDownloadDialog from '$lib/components/dialogs/ReportDownloadDialog.svelte';
	import Back from '$lib/components/UI/Back.svelte';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiBattery, mdiBatteryUnknown, mdiClose, mdiCog, mdiRobot } from '@mdi/js';
	import moment from 'moment';
	import { Button, Icon, Tooltip, Duration, PeriodType } from 'svelte-ux';

	let { children } = $props();
	let userContext = getUserState();
	let location_id: number = +$page.params.location_id; // This returns a STRING!!!!
	let location = $derived(userContext.allLocations.find((loc) => loc.location_id === location_id));
	let device = $derived(location?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui));

	function handleRangeSelect(range: {
		from: Date | null;
		to: Date | null;
		periodType?: PeriodType | null;
	}) {
		if (device && range.from && range.to) {
			userContext.allLocations
				.find((loc) => loc.location_id === location_id)
				.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui).latest_data =
				userContext.fetchLatestDeviceData(device, range.from, range.to);
		}
	}
</script>

<section class="p-4">
	<h2 class="mb-2 flex gap-4 border-b pb-4">
		<div class="flex flex-row w-full">
			<div class="flex flex-row items-center gap-2">
				<Back />
				<Tooltip title={`DevEUI: ${device?.dev_eui}`}>
					<div class="flex flex-col gap-0">
						<span>{device?.name} {$page.url.pathname.includes('settings') ? 'Settings' : ''}</span>
						<span class="text-xs"
							>{nameToJapaneseName('Last seen')}: <Duration
								start={device?.latest_data?.created_at}
								totalUnits={1}
							/>
							{nameToJapaneseName('ago')}</span
						>
					</div>
				</Tooltip>
			</div>
			<span class="flex-1"></span>
			<div class="flex flex-row gap-2 justify-end">
				{#if device?.latest_data?.battery}
				<Tooltip
					title={device?.latest_data?.battery
						? `Battery Level: ${device?.latest_data?.battery}%`
						: 'Battery Level Unknown'}
				>
					<span class="flex items-center gap-1">
						<Icon
							data={device?.latest_data?.battery ? mdiBattery : mdiBatteryUnknown}
							class={device?.latest_data?.battery ? 'text-surface-content/50' : 'text-warning'}
							size="1em"
							variant="fill-fight"
						/>
					</span>
				</Tooltip>
				{/if}
				<Tooltip title="Data Time Range"></Tooltip>
				<Tooltip>
					<DataDateRangeSelectDialog onrangeselect={handleRangeSelect} />
				</Tooltip>
				{#if device?.ai_provider}
					<Tooltip title="AI Analysis">
						<Button icon={mdiRobot} variant="fill-light" rounded="full"></Button>
					</Tooltip>
				{/if}
				{#if device?.report_endpoint}
					<Tooltip title={nameToJapaneseName('Report Download')}>
						<ReportDownloadDialog devEui={device?.dev_eui} />
					</Tooltip>
				{/if}
				<Tooltip title={nameToJapaneseName('CSV Download')}>
					<CsvDownloadDialog devEui={device?.dev_eui} />
				</Tooltip>
				<Tooltip title="Settings">
					<Button
						icon={$page.url.pathname.includes('settings') ? mdiClose : mdiCog}
						variant="fill-light"
						rounded="full"
						color={$page.url.pathname.includes('settings') ? 'accent' : 'default'}
						href={$page.url.pathname.includes('settings')
							? `/app/location/${location_id}/devices/${device?.dev_eui}/detail`
							: `/app/location/${location_id}/devices/${device?.dev_eui}/settings`}
					></Button>
				</Tooltip>
			</div>
		</div>
	</h2>
	<section class="mb-5 flex flex-row justify-between gap-1">
		<Button
			variant="fill-outline"
			class="hidden w-full xl:block"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(2, 'months').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('2m')}</Button
		>
		<Button
			variant="fill-outline"
			class="hidden w-full md:block"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(1, 'month').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('1m')}</Button
		>
		<Button
			variant="fill-outline"
			class="hidden w-full md:block"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(3, 'weeks').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('3w')}</Button
		>
		<Button
			variant="fill-outline"
			class="w-full"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(2, 'weeks').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('2w')}</Button
		>
		<Button
			variant="fill-outline"
			class="w-full"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(1, 'week').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('1w')}</Button
		>
		<Button
			variant="fill-outline"
			class="w-full"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(3, 'days').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('3d')}</Button
		>
		<Button
			variant="fill-outline"
			class="w-full"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(2, 'days').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('2d')}</Button
		>
		<Button
			variant="fill-outline"
			class="w-full"
			on:click={() =>
				handleRangeSelect({
					from: moment().subtract(1, 'day').toDate(),
					to: moment().toDate()
				})}>{nameToJapaneseName('1d')}</Button
		>
	</section>
	{@render children()}
</section>
