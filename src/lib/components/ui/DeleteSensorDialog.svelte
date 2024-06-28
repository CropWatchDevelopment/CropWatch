<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, Toggle } from 'svelte-ux';
    export let dev_eui: string = $page.params.dev_eui ?? 'NS';

	const handleSubmit = () => {
		fetch(`/api/v1/devices/${dev_eui}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('Success:', data);
                localStorage.removeItem('deviceStore');
                goto('/app');
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	};
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button icon={mdiTrashCan} on:click={toggle} color="danger">Delete Sensor</Button>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">Are you sure?</div>
		<div class="px-6 py-3">This will permanently delete the item and can not be undone.</div>
		<div slot="actions">
			<Button
				on:click={() => {
					handleSubmit();
                    toggleOff();
				}}
				variant="fill"
				color="danger"
			>
				Yes, delete item
			</Button>
			<Button>Cancel</Button>
		</div>
	</Dialog>
</Toggle>
