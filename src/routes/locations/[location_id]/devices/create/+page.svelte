<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
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
	import { TTI_DEVICE_ID_MAX_LENGTH } from '$lib/devices/tti-device-id';
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

	let fields = $state<CreateDeviceFieldValues>(buildFieldValues());
	let installedAt = $state<CwSingleDateValue | undefined>(toSingleDateValue(fields.installed_at));
</script>

<svelte:head>
	<title>{m.devices_create_page_title()}</title>
</svelte:head>

<AppPage width="lg">
	<CwButton
		variant="secondary"
		size="sm"
		onclick={() =>
			goto(resolve('/locations/[location_id]', { location_id: locationId }))}
	>
		&larr; {m.action_back()}
	</CwButton>

	<CwCard title={m.devices_create_page_title()} elevated>
		<form
			method="POST"
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
			<AppFormStack padded>
				{#if actionForm?.error}
					<AppNotice tone="danger">
						<p>{actionForm.error}</p>
					</AppNotice>
				{/if}

				<input type="hidden" name="location_id" value={fields.location_id} />

				<!-- Basic info -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
						name="tti_name"
						label={m.devices_tti_device_id_label()}
						maxlength={TTI_DEVICE_ID_MAX_LENGTH}
						placeholder={m.devices_tti_device_id_placeholder()}
						bind:value={fields.tti_name}
					/>

					<input type="hidden" name="upload_interval" />
				</div>

				<!-- Deployment -->
				<hr class="border-[var(--cw-border-muted)]" />
				<h2 class="m-0 text-sm font-bold">{m.devices_deployment_section_title()}</h2>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

					<div>
						<p class="m-0 mb-1 text-sm font-bold">{m.devices_installed_at_label()}</p>
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

				<AppActionRow>
					<CwButton
						type="button"
						variant="ghost"
						onclick={() =>
							goto(resolve('/locations/[location_id]', { location_id: locationId }))}
					>
						{m.action_cancel()}
					</CwButton>
					<CwButton type="submit" variant="primary" loading={submitting}>
						{m.devices_create_submit()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
</AppPage>
