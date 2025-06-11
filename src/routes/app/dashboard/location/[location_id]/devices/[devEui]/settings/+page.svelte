<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AlertDialog } from 'bits-ui';
import { enhance } from '$app/forms';
import { error, success } from '$lib/stores/toast.svelte.js';
import { formValidation } from '$lib/actions/formValidation';

	let { data } = $props();
	let locations = $derived(data.locations);
	let device = $derived(data.device);
	let ownerId = $derived(data.ownerId);

	let devEui = $page.params.devEui;
	if (!devEui) {
		goto('/dashboard'); // DevEui was not found, run to safety!
	}

	async function deleteDevice() {
		const res = await fetch(`/api/devices/${devEui}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (res.ok) {
			goto('/app/dashboard');
		} else {
			alert('Failed to delete device');
		}
	}

	function showSuccessToast() {
		success('Success! Operation completed successfully.');
	}

	function showErrorToast() {
		error('Error! Something went wrong.');
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-bold">Device Settings</h1>
	<p class="text-muted text-sm">Settings for device {devEui}</p>
	<button class="btn btn-primary" onclick={() => goto('/app/dashboard')}> Go to Dashboard </button>
	<button onclick={() => goto(`settings/rules`)}>📜 Rules</button>
	<button onclick={() => goto(`settings/permissions`)}>🔒 Permissions</button>
</div>

<div>
	<h2 class="text-xl font-semibold">Device Information</h2>
	<p class="text-muted text-sm">Here you can view and edit device information.</p>
       <form
               class="form-container"
               id="deviceSettingsForm"
               method="POST"
               action="?/updateGeneralSettings"
               use:enhance={({ formElement, formData, action, cancel, submitter }) => {
                       return async ({ result, update }) => {
                               if (result.data.success) {
                                       success('Settings updated successfully!');
                                       update();
                               } else {
                                       error('Failed to update settings');
                               }
                       };
               }}
               use:formValidation
       >
		<div class="mt-4 flex flex-col gap-2">
			<label for="deviceName" class="text-sm font-medium">Device Name</label>
			<input
				id="deviceName"
				name="name"
				type="text"
				placeholder="Enter device name"
				value={device?.name}
				class="rounded-input bg-muted p-2"
			/>
		</div>

		{#if device?.user_id == ownerId}
			<div class="mt-4 flex flex-col gap-2">
				<label for="deviceName" class="text-sm font-medium">Device Location</label>
				<select
					id="deviceLocation"
					name="location_id"
					value={device?.location_id}
					class="rounded-input bg-muted p-2"
				>
					{#each locations as loc}
						<option value={loc.location_id}>{loc.name}</option>
					{/each}
				</select>
			</div>
		{/if}
               <button type="submit" class="btn btn-primary mt-4" disabled>Save Changes</button>
       </form>
</div>

<div class="bg-danger flex flex-col gap-4">
	<h2>Super danger dangerous zone</h2>
	<p class="text-muted text-sm">This is a super dangerous zone. Do not touch anything here.</p>
	<AlertDialog.Root>
		<AlertDialog.Trigger
			class="rounded-input bg-dark text-background
	shadow-mini hover:bg-dark/95 inline-flex h-12 items-center
	justify-center px-[21px] text-[15px] font-semibold whitespace-nowrap transition-all select-none active:scale-[0.98]"
		>
			DELETE DEVICE & ASSOCIATED DATA
		</AlertDialog.Trigger>
		<AlertDialog.Portal>
			<AlertDialog.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
			/>
			<AlertDialog.Content
				class="rounded-card-lg bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border p-7 outline-hidden sm:max-w-lg md:w-full "
			>
				<div class="flex flex-col gap-4 pb-6">
					<AlertDialog.Title class="text-lg font-semibold tracking-tight">
						ARE YOU SURE YOU WANT TO DELETE THIS???
					</AlertDialog.Title>
					<AlertDialog.Description class="text-foreground-alt text-sm">
						DELETING THIS DEVICE WILL BE PERMANENT AND IRREVERSIBLE. ALL DATA ASSOCIATED WITH THIS
						DEVICE WILL BE LOST. WE WILL NOT BE ABLE TO RECOVER THIS DATA. DO NOT DO THIS UNLESS YOU
						KNOW WHAT YOU ARE DOING!
					</AlertDialog.Description>
				</div>
				<div class="flex w-full items-center justify-center gap-2">
					<AlertDialog.Cancel
						class="h-input rounded-input bg-muted shadow-mini hover:bg-dark-10 focus-visible:ring-foreground focus-visible:ring-offset-background inline-flex w-full items-center justify-center text-[15px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden active:scale-[0.98]"
					>
						Cancel
					</AlertDialog.Cancel>
					<AlertDialog.Action
						onclick={deleteDevice}
						class="h-input rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 focus-visible:ring-dark focus-visible:ring-offset-background inline-flex w-full items-center justify-center text-[15px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden active:scale-[0.98]"
					>
						Continue
					</AlertDialog.Action>
				</div>
			</AlertDialog.Content>
		</AlertDialog.Portal>
	</AlertDialog.Root>
</div>
