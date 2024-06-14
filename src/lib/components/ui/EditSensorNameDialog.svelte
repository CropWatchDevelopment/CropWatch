<script lang="ts">
	import { enhance } from '$app/forms';
	import { mdiClose, mdiFloppy, mdiPencil } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, Dialog, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	
	export let currentSensorName: string = '';
	export let dev_eui: string = -1;
	let currentSensorNameStatic = currentSensorName;
	let open = false;

	const handleSubmit = () => {
		fetch(`/api/v1/devices/${dev_eui}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name: currentSensorName })
		})
			.then((res) => {
				if (res.ok) {
					toast.push(`Sensor name updated successfully`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
					currentSensorNameStatic = currentSensorName;
				} else {
					toast.push(`Sensor name updated FAILED`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
					currentSensorName = currentSensorNameStatic;
					open = false;
				}
				return res.json();
			})
			.then((data) => {
				currentSensorName = data.name;
				open = false;
			})
			.catch((err) => {
				console.error(err);
				currentSensorName = currentSensorNameStatic;
				open = false;
			});
	};

	const closing = () => {
		currentSensorName = currentSensorNameStatic;
		open = false;
	};
</script>

<Button on:click={() => (open = true)} icon={mdiPencil} size="sm" />

<form action={`/api/v1/sensors/${dev_eui}`} method="PUT">
	<Dialog bind:open on:close={() => closing()}>
		<div slot="title">{$_('rename_dialog.rename')} {currentSensorNameStatic} {$_('rename_dialog.to_what')}</div>
		<div class="m-4">
			<TextField name="newName" label={$_('rename_dialog.new_name')} bind:value={currentSensorName} />
		</div>
		<div class="flex flex-row mt-1 p-2">
			<Button variant="fill" icon={mdiClose} on:click={() => (open = false)} color="danger">{$_('close')}</Button>
			<span class="flex-grow" />
			<Button
				variant="fill"
				type="button"
				icon={mdiFloppy}
				on:click={() => handleSubmit()}
				color="success">{$_('save')}</Button
			>
		</div>
	</Dialog>
</form>
