<script lang="ts">
	import {
	mdiAlert,
		mdiBattery,
		mdiDotsVertical,
		mdiListStatus,
		mdiRadioTower,
		mdiViewDashboard
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Header,
		Icon,
		Menu,
		MenuItem,
		ProgressCircle,
		Toggle
	} from 'svelte-ux';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import CwTable from '$lib/components/table/CWTable.svelte';
	import { openFeedback } from '$lib/stores/feedback.store.js';
	import { onMount } from 'svelte';
	import moment from 'moment';
	import { supabase } from '$lib/supabaseClient';

	export let data;

	let sensors = null;
	let gridData = null;

	async function getDataForSensor(data_table: string, dev_eui: string) {
		debugger;
		try {
			const { data, error } = await supabase
				.from(data_table)
				.select('*')
				.eq('dev_eui', dev_eui)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();
			if (!data) {
				console.error('getDataForSensor', error);
				return [];
			} else {
				return data;
			}
		} catch (error) {
			return [];
		}
	}

	onMount(async () => {
		const deviceTableResponse = await fetch('/api/device-table', { method: 'GET' });
		sensors = await deviceTableResponse.json();

		for (let i = 0; i < sensors.length; i++) {
			const data_table = sensors[i].cw_devices.cw_device_type.data_table;
			if (data_table) {
				const dev_data = await getDataForSensor(data_table, sensors[i].cw_devices.dev_eui);
				sensors[i].data = Object.assign({}, sensors[i], dev_data);
			}
		}

		const transformedData = sensors.map((sensor) => {
			// Extracting the sensor's name
			const name = sensor.cw_devices.name;

			// Extracting the created_at timestamp from sensor data if available, otherwise from the device type
			const lastSeen = sensor.data?.created_at ?? sensor.cw_devices.cw_device_type.created_at;

			// const devEui = sensor.cw_devices.dev_eui;

			const Location = sensor.cw_devices?.cw_device_locations;

			const model = sensor.cw_devices.cw_device_type.id;

			// Extract additional sensor data, e.g., temperature, and format it
			const primaryData = sensor.data[sensor.cw_devices.cw_device_type.primary_data]
				? `${sensor.data[sensor.cw_devices.cw_device_type.primary_data]}${sensor.cw_devices.cw_device_type.primary_data_notation}`
				: 'N/A';

			// Here, you can add more sensor data as needed
			// const otherSensorData = ...

			let active = '⚪';
			if (sensor.cw_devices.upload_interval > 0) {
				if (
					moment(lastSeen).add(sensor.cw_devices.upload_interval, 'minutes').isAfter(moment().utc())
				) {
					active = '🟢';
				} else {
					active = '🔴';
				}
			}

			const url = sensor.cw_devices.cw_device_type.device_app;

			const locationName = Location?.cw_locations?.name ?? 'N/A';

			return { active, name, locationName, Location, lastSeen, model, primaryData, url };
		});
		gridData = transformedData;
	});
</script>

<h1
	class="mb-2 flex items-center text-2xl font-bold border-b mb-4 w-full text-white relative"
	style="left:-8px; top:-8px; background-image:url({backgroundImg}); width:100%; height: 120px;"
>
	<div class="flex items-center space-x-2 ml-2">
		<Icon data={mdiViewDashboard} />
		<span>Dashboard</span>
	</div>
</h1>

<div class="grid grid-cols-1 md:grid-cols-4 gap-5">
	<Card>
		<Header title="Device Status" subheading="Reporting devices" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiListStatus} />
				</Avatar>
			</div>
			<div slot="actions">
				<Toggle let:on={open} let:toggle>
					<Button on:click={toggle}>
						<Icon data={mdiDotsVertical} />
						<Menu {open} on:close={toggle}>
							<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
						</Menu>
					</Button>
				</Toggle>
			</div>
		</Header>
		<h1 class="mb-2 text-4xl md:text-2xl lg:text-4xl text-gray-700" slot="contents">
			{#if gridData}
				{gridData.filter((sensor) => sensor.active === '🟢').length} / {gridData.length} Online
			{/if}
		</h1>
	</Card>

	<CWStatCard
		title="Gateways Online"
		icon={mdiRadioTower}
		value={3}
		notation=" Online"
		counterStartTime={null}
		><div slot="headerMore">
			<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
		</div>
	</CWStatCard>
	<Card>
		<Header title="Notifications" subheading="no new notifications" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiAlert} />
				</Avatar>
			</div>
			<div slot="actions">
				<Toggle let:on={open} let:toggle>
					<Button on:click={toggle}>
						<Icon data={mdiDotsVertical} />
						<Menu {open} on:close={toggle}>
							<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
						</Menu>
					</Button>
				</Toggle>
			</div>
		</Header>
		<h1 class="text-4xl md:text-2xl lg:text-4xl text-gray-700" slot="contents">
			0
		</h1>
	</Card>
	<Card>
		<Header title="Battery Levels" subheading="" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiBattery} />
				</Avatar>
			</div>
			<div slot="actions">
				<Toggle let:on={open} let:toggle>
					<Button on:click={toggle}>
						<Icon data={mdiDotsVertical} />
						<Menu {open} on:close={toggle}>
							<MenuItem on:click={() => openFeedback()}>Give Feedback</MenuItem>
						</Menu>
					</Button>
				</Toggle>
			</div>
		</Header>
		<h1 class="text-4xl md:text-2xl lg:text-4xl text-gray-700" slot="contents">
			{#if gridData}
				0 / {gridData.length} Low Battery
			{/if}
		</h1>
	</Card>
</div>

<Card class="mt-10">
	{#if gridData}
		<CwTable data={gridData} />
	{:else}
		<div class="mx-auto">
			<ProgressCircle />
			<p>Loading...</p>
		</div>
	{/if}
</Card>

<style global>
	@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';
</style>
