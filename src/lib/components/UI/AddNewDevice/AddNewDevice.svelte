<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import type { StripeProduct } from '$lib/interfaces/Stripe-Product.interface';
	import { mdiCreditCard, mdiQrcodeScan } from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Checkbox,
		cls,
		Field,
		Header,
		Input,
		ListItem,
		ProgressCircle,
		Radio,
		SelectField,
		TextField,
		Tooltip
	} from 'svelte-ux';
	import QrCodeScanner from '$lib/components/dialogs/QRCodeScanner.svelte';
	import type { Tables } from '$lib/types/database.types';

	let { addDeviceForm = $bindable(), location } = $props();

	if (!location) {
		throw new Error('Location is required');
	}

	if (!addDeviceForm) {
		throw new Error('addDeviceForm is required');
	}

	console.log('adddeviceform', addDeviceForm);

	const { form, errors, enhance, submitting } = superForm(addDeviceForm.data,
	// {
	// 	validators: zod(deviceSchema),
	// 	validationMethod: 'onblur',
	// 	taintedMessage: null,
	// 	// onSubmit: ({ data, cancel }) => {
	// 	// 	// if (!data.subscriptionId) {
	// 	// 	// 	cancel();
	// 	// 	// 	return;
	// 	// 	// }
	// 	// },
	// 	onResult: ({ result }) => {
	// 		// Handle the result
	// 		if (result.type === 'success') {
	// 			// Redirect to success page or show success message
	// 		}
	// 	}
	// }
);

	let products: StripeProduct[] = $state([]);
	let productsLoading: boolean = $state(true);

	let deviceTypes: any[] = $state([]);
	let deviceTypesLoading: boolean = $state(true);

	let qrcode = $state(null);
	let selectedId = $state('');
	fetch('/api/payments/stripe/products')
		.then((res) => res.json())
		.then((data) => {
			console.log(data);
			products = data.products as StripeProduct[];
		})
		.catch((err) => {
			console.error(err);
		})
		.finally(() => {
			productsLoading = false;
		});
	fetch('/api/device/device-types')
		.then((res) => res.json())
		.then((data) => {
			deviceTypes = data.map((item: Tables<'cw_device_type'>) => {
				return {
					value: item.id,
					label: item.name
				};
			});
		})
		.catch((err) => {
			console.error(err);
		})
		.finally(() => {
			deviceTypesLoading = false;
		});
</script>

<h1>Add New Device</h1>

<form method="POST" use:enhance class="flex flex-col gap-4">
	<h2>Choose a Subscription Plan</h2>
	<div class="rounded border">
		{#if productsLoading}
			<ProgressCircle /> Loading Subscriptions
		{:else if products.length === 0}
			<Card>No products available</Card>
		{/if}
		{#each products as product}
			<ListItem
				title={product.name}
				subheading={product.description}
				on:click={() => {
					$form.subscriptionId = product.id;
				}}
			>
			<div slot="avatar" class="contents">
					{product.id}
					{$form.subscriptionId}
					<Checkbox checked={$form.subscriptionId === product.id} />
				</div>
			</ListItem>
		{/each}
		{#if $errors.subscriptionId}
			<p class="text-error-500 mt-1 text-sm">{$errors.subscriptionId}</p>
		{/if}
	</div>

	<h2>Device Information</h2>
	<div class="flex flex-col gap-4">
		<TextField
			name="deviceName"
			label="Device Name"
			placeholder="Example: North Side Sensor"
			bind:value={$form.deviceName}
			error={$errors.deviceName}
		/>
		<TextField
			name="deviceDescription"
			label="Device Description"
			multiline
			placeholder="Example: This device is on the north side of the house in this location"
			bind:value={$form.deviceDescription}
			error={$errors.deviceDescription}
		/>
	</div>

	<Card class="flex flex-col gap-4 px-6 pb-5">
		<Header title="Connection Settings" subheading="Device Connection Details" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary font-bold text-primary-content">A</Avatar>
			</div>
			<div slot="actions">
				<QrCodeScanner bind:qrcode />
			</div>
		</Header>

		<div class="flex flex-row gap-4">
			<SelectField
				name="deviceType"
				bind:value={$form.deviceType}
				options={deviceTypes}
				loading={deviceTypesLoading}
				placeholder="Select a Device Type"
				error={$errors.deviceType}
			/>
		</div>

		<div class="flex flex-col gap-4">
			<Field label="DevEUI" error={$errors.devEui}>
				<Input
					name="devEui"
					bind:value={$form.devEui}
					mask="XX:XX:XX:XX:XX:XX:XX:XX"
					replace="X"
					accept="[\\da-fA-F]"
				/>
			</Field>
		</div>

		<div class="flex flex-col gap-4">
			<Field label="AppEUI/JoinEUI" error={$errors.joinEui}>
				<Input
					name="joinEui"
					bind:value={$form.joinEui}
					mask="XX:XX:XX:XX:XX:XX:XX:XX"
					replace="X"
					accept="[\\da-fA-F]"
				/>
			</Field>
		</div>

		<div class="flex flex-col gap-4">
			<Field label="AppKey" error={$errors.appKey}>
				<Input
					name="appKey"
					bind:value={$form.appKey}
					mask="XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
					replace="X"
					accept="[\\da-fA-F]"
				/>
			</Field>
		</div>
	</Card>

	<Button
		type="submit"
		variant="fill"
		icon={mdiCreditCard}
		loading={$submitting}
		disabled={$submitting}
	>
		Checkout
	</Button>
</form>
