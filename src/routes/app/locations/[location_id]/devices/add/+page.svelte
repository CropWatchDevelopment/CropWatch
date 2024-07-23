<script lang="ts">
	import { page } from '$app/stores';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import Back from '$lib/components/ui/Back.svelte';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';
	import {
		Button,
		DateField,
		Icon,
		NumberStepper,
		ProgressCircle,
		TextField,
		SelectField
	} from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import type { Tables } from '../../../../../../database.types';
	import { mdiCalendarStart, mdiFloppy, mdiMapMarker, mdiQrcode } from '@mdi/js';
	import { onDestroy, onMount } from 'svelte';
	import QrScanner from 'qr-scanner';
	import { toast } from '@zerodevx/svelte-toast';

	const location: Promise<Tables<'cw_locations'>> = browser
		? fetch(`/api/v1/locations/${$page.params.location_id}`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);

	const deviceTypes: Promise<Tables<'cw_device_type'>> = supabase
		.from('cw_device_type')
		.select('name, id');

	let dev_eui = '';
	let upload_interval: number = -1;
	let dev_type: number = 0;
	let latitude: number = 0;
	let longitude: number = 0;
	let currentDate: Date = new Date();

	let videoElem: HTMLVideoElement;
	let qrScanner: QrScanner = null;

	const stopScanner: () => void = () => {
		if (qrScanner) {
			qrScanner.stop();
			qrScanner.destroy();
			qrScanner = null;
		}
	};
	let toggleQR: () => void = () => {
		if (qrScanner) {
			stopScanner();
		} else {
			qrScanner = new QrScanner(videoElem, (result) => {
				try {
					const data = JSON.parse(result);
					stopScanner();
					toast.push(`Scan Success`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
					data.dev_eui && (dev_eui = data.dev_eui);
					data.upload_interval && (upload_interval = data.upload_interval);
					data.dev_type && (dev_type = data.dev_type);
				} catch (error) {
					console.error(error);
					toast.push(`Scan Failed`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
					stopScanner();
				}
			});
			qrScanner.start();
		}
	};

	onDestroy(() => {
		stopScanner();
	});
</script>

<div class="">
	<div class="mt-8 flex justify-between">
		<Back previousPage={`/app/locations/${$page.params.location_id}`} />
	</div>

	{#await location}
		<ProgressCircle />
	{:then loc}
		{#if loc}
			<div class="flex justify-between my-5">
				<h2 class="font-light text-2xl text-surface-100">
					{$_('app.location.add.title')}
				</h2>
			</div>
			<DarkCard2>
				<Leaflet
					view={[loc.cw_locations?.latitude ?? 0, loc.cw_locations?.longitude ?? 0]}
					zoom={19}
					disableZoom={true}
					width={100}
					height={270}
					on:mapclick={(e) => {
						latitude = e.detail.latitude;
						longitude = e.detail.longitude;
					}}
				>
					{#key latitude + longitude}
						<Marker latLng={[latitude, longitude]} width={50} height={50}
							><Icon data={mdiMapMarker} class="text-red-600 w-full h-full" /></Marker
						>
					{/key}
				</Leaflet>
			</DarkCard2>
		{/if}
	{/await}

	<video bind:this={videoElem} width={qrScanner ? '400px' : '0px'}>
		<track kind="captions" />
	</video>

	<Button icon={mdiQrcode} on:click={() => toggleQR()}>{!qrScanner ? 'Start Camera' : 'Stop Camera'}</Button>

	<form method="post" action="/api/v1/devices">
		<input type="hidden" name="location_id" value={$page.params.location_id} />

		<div class="flex flex-col gap-2 m-4 flex-grow">
			<TextField
				name="name"
				label={$_('app.device.add.name')}
				placeholder={$_('app.device.add.namePlaceholder')}
				required
			/>
			<TextField
				placeholder={$_('app.device.add.macAddress')}
				name="dev_eui"
				label={$_('app.device.add.deviceEUI')}
				bind:value={dev_eui}
				required
			/>
			{#await deviceTypes}
				<ProgressCircle />
			{:then types}
				<SelectField
					classes={{ root: 'z-10' }}
					bind:value={dev_type}
					name="type"
					options={types.data.map((m) => {
						return { label: m.name, value: m.id };
					})}
					on:change={(e) => console.log('on:change', e.detail)}
					label={$_('app.device.add.deviceType')}
					required
				/>
			{/await}
			<div class="grid grid-cols-2 grid-col gap-5">
				<TextField label="Latitude" placeholder={'131.000'} name="lat" bind:value={latitude} required />
				<TextField label="Longitude" placeholder={'32.000'} name="long" bind:value={longitude} required />
			</div>
			<NumberStepper
				class="w-full"
				name="upload_interval"
				bind:value={upload_interval}
				label={$_('app.device.add.upload_interval')}
				min={-1}
				required
			/>
			<DateField name="installed_at" label="Installed At" icon={mdiCalendarStart} bind:value={currentDate} required />
		</div>
		<Button type="submit" class="w-full" variant="fill" color="success" icon={mdiFloppy}>
			{$_('app.device.add.submit')}
		</Button>
	</form>
</div>
