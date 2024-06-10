<script lang="ts">
	import { mdiClose, mdiFloppy, mdiPencil } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, Dialog, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	
	export let currentLocationName: string = '';
	let currentLocationNameStatic = currentLocationName;
	export let locationId: number = -1;
	let open = false;

	const handleSubmit = () => {
		debugger;
		fetch(`/api/v1/locations/${locationId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name: currentLocationName })
		})
			.then((res) => {
				if (res.ok) {
					toast.push(`Location name updated successfully`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
					currentLocationNameStatic = currentLocationName;
				} else {
					toast.push(`Location name updated FAILED`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
					currentLocationName = currentLocationNameStatic;
					open = false;
				}
				return res.json();
			})
			.then((data) => {
				console.log(data);
				currentLocationName = data.name;
				open = false;
			})
			.catch((err) => {
				console.error(err);
				currentLocationName = currentLocationNameStatic;
				open = false;
			});
	};

	const closing = () => {
		currentLocationName = currentLocationNameStatic;
		open = false;
	};
</script>

<Button on:click={() => (open = true)} icon={mdiPencil} size="sm" class="ml-2" />

<form action={`/api/v1/locations/${locationId}`} method="PUT">
	<Dialog bind:open on:close={() => closing()}>
		<div slot="title">{$_('rename_dialog.rename')} {currentLocationNameStatic} {$_('rename_dialog.to_what')}</div>
		<div class="m-4">
			<TextField name="newName" label={$_('rename_dialog.new_name')} bind:value={currentLocationName} />
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
