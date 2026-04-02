<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		CwButton,
		CwCard,
		CwDateTimeRangePicker,
		CwDropdown,
		CwInput,
		type CwSingleDateValue,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	type CreateDeviceForm = {
		error?: string;
		success?: boolean;
		message?: string;
		dev_eui?: string;
		name?: string;
		type?: string;
		group?: string;
		upload_interval?: string;
		location_id?: string;
		lat?: string;
		long?: string;
		installed_at?: string;
		battery_changed_at?: string;
		warranty_start_date?: string;
		sensor_serial?: string;
		sensor1_serial?: string;
		sensor2_serial?: string;
		tti_name?: string;
		report_endpoint?: string;
		owner_user_id?: string;
		owner_permission_level?: string;
	} | null;

	type CreateDeviceFieldValues = {
		dev_eui: string;
		name: string;
		type: string;
		group: string;
		upload_interval: string;
		location_id: string;
		lat: string;
		long: string;
		installed_at: string;
		battery_changed_at: string;
		warranty_start_date: string;
		sensor_serial: string;
		sensor1_serial: string;
		sensor2_serial: string;
		tti_name: string;
		report_endpoint: string;
		owner_user_id: string;
		owner_permission_level: string;
	};

	const toast = useCwToast();

	let { data, form }: PageProps = $props();
	let locationId = $derived(data.locationId ?? '');
	let locationName = $derived(data.locationName ?? locationId);
	let deviceTypeOptions = $derived(data.deviceTypeOptions ?? []);

	let submitting = $state(false);
	let actionForm = $derived((form ?? null) as CreateDeviceForm);

	function fieldValue(name: keyof CreateDeviceFieldValues, fallback = ''): string {
		const value = actionForm?.[name];
		return typeof value === 'string' ? value : fallback;
	}

	function buildFieldValues(): CreateDeviceFieldValues {
		return {
			dev_eui: fieldValue('dev_eui'),
			name: fieldValue('name'),
			type: fieldValue('type'),
			group: fieldValue('group'),
			upload_interval: fieldValue('upload_interval'),
			location_id: fieldValue('location_id', locationId),
			lat: fieldValue('lat'),
			long: fieldValue('long'),
			installed_at: fieldValue('installed_at'),
			battery_changed_at: fieldValue('battery_changed_at'),
			warranty_start_date: fieldValue('warranty_start_date'),
			sensor_serial: fieldValue('sensor_serial'),
			sensor1_serial: fieldValue('sensor1_serial'),
			sensor2_serial: fieldValue('sensor2_serial'),
			tti_name: fieldValue('tti_name'),
			report_endpoint: fieldValue('report_endpoint'),
			owner_user_id: fieldValue('owner_user_id'),
			owner_permission_level: fieldValue('owner_permission_level', '1')
		};
	}

	function toSingleDateValue(value: string): CwSingleDateValue | undefined {
		if (!value) return undefined;

		const [yearRaw, monthRaw, dayRaw] = value.split('-');
		const year = Number.parseInt(yearRaw ?? '', 10);
		const month = Number.parseInt(monthRaw ?? '', 10);
		const day = Number.parseInt(dayRaw ?? '', 10);

		if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
			return undefined;
		}

		return {
			date: new Date(year, month - 1, day)
		};
	}

	const permissionLevels = [
		{ label: 'Admin', value: '1' },
		{ label: 'Manager', value: '2' },
		{ label: 'User', value: '3' },
		{ label: 'Disabled', value: '4' }
	];

	let fields = $state<CreateDeviceFieldValues>(buildFieldValues());
	let installedAt = $state<CwSingleDateValue | undefined>(toSingleDateValue(fields.installed_at));
	let batteryChangedAt = $state<CwSingleDateValue | undefined>(
		toSingleDateValue(fields.battery_changed_at)
	);
	let warrantyStartDate = $state<CwSingleDateValue | undefined>(
		toSingleDateValue(fields.warranty_start_date)
	);
</script>

<svelte:head>
	<title>{m.devices_create_page_title()}</title>
</svelte:head>

<div class="create-device-page overflow-y-auto p-4">
	<CwCard
		title={m.devices_create_page_title()}
		subtitle={m.devices_create_page_subtitle({ locationId: locationName })}
		elevated
	>
		<form
			method="POST"
			class="device-form"
			use:enhance={() => {
				submitting = true;

				return async ({ result }) => {
					submitting = false;

					if (result.type === 'success' && typeof result.data?.dev_eui === 'string') {
						await goto(
							resolve('/locations/[location_id]/devices/[dev_eui]', {
								location_id: locationId,
								dev_eui: result.data.dev_eui
							}),
							{ invalidateAll: true }
						);
						return;
					}

					await applyAction(result);

					if (result.type === 'failure' && typeof result.data?.error === 'string') {
						toast.add({ tone: 'danger', message: result.data.error });
					}
				};
			}}
		>
			{#if actionForm?.error}
				<p class="form-error">{actionForm.error}</p>
			{/if}

			<input type="hidden" name="location_id" value={fields.location_id} />

			<section class="form-section">
				<div>
					<h2>{m.devices_identity_section_title()}</h2>
					<p>{m.devices_identity_section_subtitle()}</p>
				</div>

				<div class="field-grid">
					<CwInput
						name="dev_eui"
						type="devEui"
						label={m.devices_dev_eui_label()}
						required
						autocomplete="off"
						placeholder={m.devices_dev_eui_placeholder()}
						bind:value={fields.dev_eui}
					/>

					<CwInput
						name="name"
						label={m.devices_device_name_label()}
						required
						placeholder={m.devices_device_name_placeholder()}
						bind:value={fields.name}
					/>

					<CwDropdown
						name="type"
						label={m.devices_device_type_label()}
						required
						placeholder={m.devices_device_type_placeholder()}
						options={deviceTypeOptions}
						bind:value={fields.type}
					/>

					<CwInput
						name="group"
						label={m.common_group()}
						placeholder={m.devices_group_placeholder()}
						bind:value={fields.group}
					/>

					<CwInput
						name="upload_interval"
						type="numeric"
						label={m.devices_upload_interval_label()}
						placeholder={m.devices_upload_interval_placeholder()}
						bind:value={fields.upload_interval}
					/>

					<CwInput label={m.devices_location_id_label()} disabled value={fields.location_id} />
				</div>
			</section>

			<section class="form-section">
				<div>
					<h2>{m.devices_deployment_section_title()}</h2>
					<p>{m.devices_deployment_section_subtitle()}</p>
				</div>

				<div class="field-grid">
					<CwInput
						name="lat"
						type="numeric"
						label={m.locations_latitude_optional()}
						placeholder={m.locations_latitude_placeholder()}
						bind:value={fields.lat}
					/>

					<CwInput
						name="long"
						type="numeric"
						label={m.locations_longitude_optional()}
						placeholder={m.locations_longitude_placeholder()}
						bind:value={fields.long}
					/>

					<div class="field">
						<span class="field-label">{m.devices_installed_at_label()}</span>
						<CwDateTimeRangePicker
							name="installed_at"
							mode="single"
							granularity="day"
							maxDate={new Date()}
							placeholder={m.devices_installed_at_placeholder()}
							bind:value={installedAt}
						/>
					</div>
				</div>
			</section>

			<div class="form-actions">
				<CwButton
					type="button"
					variant="secondary"
					onclick={() => goto(resolve('/locations/[location_id]', { location_id: locationId }))}
				>
					<Icon src={BACK_ICON} alt="" class="h-4 w-4" />
					{m.action_cancel()}
				</CwButton>

				<CwButton type="submit" variant="primary" loading={submitting}
					>{m.devices_create_submit()}</CwButton
				>
			</div>
		</form>
	</CwCard>
</div>

<style>
	.create-device-page {
		padding: 1rem;
		width: 100%;
		height: 100%;
	}

	.device-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-note {
		margin: 0;
		padding: 0.9rem 1rem;
		border-radius: 0.75rem;
		background: #f4f7f3;
		color: #365314;
		font-size: 0.95rem;
	}

	.form-error {
		margin: 0;
		padding: 0.9rem 1rem;
		border-radius: 0.75rem;
		background: #fef3f2;
		color: #b42318;
		font-size: 0.95rem;
	}

	.form-section {
		display: grid;
		gap: 1rem;
		padding-top: 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.form-section h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.form-section p {
		margin: 0;
		color: #475467;
		font-size: 0.94rem;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.field-label {
		font-size: 0.92rem;
		font-weight: 600;
		color: #1f2937;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	@media (max-width: 720px) {
		.field-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
