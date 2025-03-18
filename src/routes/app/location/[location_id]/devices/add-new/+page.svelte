<!-- +page.svelte -->
<script lang="ts">
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { Avatar, Card, Field, Header, Icon, Input, SelectField, TextField } from 'svelte-ux';
	import { mdiPackageVariantClosedPlus } from '@mdi/js';

	// data comes from load()
	let { data } = $props();
	let frequencies = $derived(data.frequencyPlans);
	let phyVersions = $derived(data.phyVersions);
    let deviceTypes = $derived(data.device_types);
	let { form, errors, enhance } = superForm(data.form, {
		onSubmit: async (values) => {
			console.log(values);
		}
	});
	let regionalParameters = $state();
	let regionalParametersOptions = $state();
	const loRaWANVersionOptions = [
		{ value: 'MAC_V1_0', label: 'LoRaWAN Specification 1.0.0' },
		{ value: 'MAC_V1_0_1', label: 'LoRaWAN Specification 1.0.1' },
		{ value: 'MAC_V1_0_2', label: 'LoRaWAN Specification 1.0.2' },
		{ value: 'MAC_V1_0_3', label: 'LoRaWAN Specification 1.0.3' },
		{ value: 'MAC_V1_0_4', label: 'LoRaWAN Specification 1.0.4' },
		{ value: 'MAC_V1_1', label: 'LoRaWAN Specification 1.1' }
	];

	const getPhyVersions = (bandId: string) => {
		if (!bandId) return [];
		const foundVersion = frequencies.find((v) => v.id == bandId);
		if (!foundVersion) return [];
		console.log(phyVersions);
		regionalParameters = phyVersions.version_info.find((v) => v.band_id == foundVersion.band_id);
		if (!regionalParameters) return [];
		regionalParametersOptions = regionalParameters.phy_versions.map((freq: string) => ({
			label: freq,
			value: freq
		}));
		if (!regionalParametersOptions) return [];
		return foundVersion.phy_versions;
	};
</script>

<div class="min-w-1/2 my-8 flex items-center justify-center">
	<Card class="px-3 py-4 shadow sm:rounded-lg sm:px-12">
		<Header
			title=" Add Device & Subscription"
			subheading="Your device will be added after your subscription has been confirned."
			slot="header"
		>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<Icon data={mdiPackageVariantClosedPlus} class="text-2xl" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center">
			<form use:enhance method="POST" class="w-full space-y-4">
				<div>
					<TextField
						id="device_id"
						name="device_id"
						type="text"
						label="Device Name"
						placeholder="North side CO₂ Sensor"
						bind:value={$form.device_id}
						error={$errors.device_id}
					/>
				</div>
<!-- <pre>{JSON.stringify(deviceTypes, null, 4)}</pre> -->
                <div>
					<SelectField
						id="tti_application_id"
						name="tti_application_id"
						options={data.device_types.map((device) => ({
                            label: device.name,
                            value: device.TTI_application_id
                        }))}
                        placeholder="Select Device Type*"
						bind:value={$form.tti_application_id}
						error={$errors.tti_application_id}
					/>
				</div>

				<div>
					<SelectField
						id="frequencyPlan"
						name="frequency_plan_id"
						options={frequencies.map((freq) => ({
							label: freq.name,
							value: freq.id
						}))}
						bind:value={$form.frequency_plan_id}
						error={$errors.frequency_plan_id}
                        placeholder="Select Frequency Plan*"
						on:change={(e) => {
							if (e.detail.value) getPhyVersions(e.detail.value);
						}}
					/>
				</div>

				<div>
					<SelectField
						id="lorawan_version"
						name="lorawan_version"
						options={loRaWANVersionOptions}
						bind:value={$form.lorawan_version}
                        placeholder="Select LoRaWAN Version*"
						error={$errors.lorawan_version}
					/>
				</div>

				<div>
					<SelectField
						id="lorawan_phy_version"
						name="lorawan_phy_version"
						options={regionalParametersOptions}
						bind:value={$form.lorawan_phy_version}
                        placeholder="Select LoRaWAN PHY Version*"
						error={$errors.lorawan_phy_version}
					/>
				</div>

				<div class="flex flex-row space-x-4">
					<Field label="Device EUI" error={$errors.devEui} class="w-full">
						<Input
							id="devEui"
							name="devEui"
							type="text"
							label="Device EUI"
							mask="XXXXXXXXXXXXXXXX"
							accept="[0-9a-f]"
							replace="X"
                            on:change={(e) => {
                                console.log(e.detail.value);
                                $form.device_id = $form.device_id + e.detail.value.toLowerCase();
                            }}
							bind:value={$form.devEui}
						/>
					</Field>

					<Field label="Device EUI" error={$errors.joinEui} class="w-full">
						<Input
							id="joinEui"
							name="joinEui"
							type="text"
							label="Join EUI"
							mask="XXXXXXXXXXXXXXXX"
							accept="[0-9a-f]"
							replace="X"
							bind:value={$form.joinEui}
							error={$errors.joinEui}
						/>
					</Field>
				</div>

				<div>
					<Field label="Device EUI" error={$errors.appKey}>
						<Input
							id="appKey"
							name="appKey"
							type="text"
							label="App Key"
							mask="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
							accept="[0-9a-f]"
							replace="X"
							bind:value={$form.appKey}
							error={$errors.appKey}
						/>
					</Field>
				</div>

				<button
					type="submit"
					class="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Create Device
				</button>
			</form>
		</div>
	</Card>
</div>
<SuperDebug data={form} />
