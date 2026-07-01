<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import type { CommunicationMethodDto, ReportFormContextDto } from '$lib/api/api.dtos';
	import {
		CwAlertPointsEditor,
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		CwMultiSelect,
		CwSeparator,
		CwSwitch,
		CwTextArea,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import ReportCadenceSection from './ReportCadenceSection.svelte';
	import ReportProcessingSchedulesSection from './ReportProcessingSchedulesSection.svelte';
	import ReportRecipientsSection from './ReportRecipientsSection.svelte';
	import { createReportAlertPointsEditorText } from './alert-points-editor-text';
	import { buildReportDataPullIntervalOptions } from './data-pull-interval';
	import {
		buildSaveRequest,
		buildValidationIssues,
		createEmptyAlertPointsValue,
		createReportTemplateDraftFactory,
		type ReportTemplateDraft,
		type SelectOption
	} from './report-template-form';

	type FormMode = 'create' | 'edit';

	interface Props {
		mode: FormMode;
		context: ReportFormContextDto;
		authToken?: string | null;
		preselectedDevEui?: string | null;
		currentUserEmail?: string | null;
		currentUserName?: string | null;
	}

	interface DeviceSelection {
		id: string;
		label: string;
	}

	let {
		mode,
		context,
		authToken = null,
		preselectedDevEui = null,
		currentUserEmail = null,
		currentUserName = null
	}: Props = $props();

	let devices = $derived(context.devices);
	let locations = $derived(context.locations);
	const initial = (() => context.template)();
	const preselectedDevice = (() => preselectedDevEui)();
	const initialUserEmail = (() => currentUserEmail ?? '')();
	const initialUserName = (() => currentUserName ?? '')();
	const toast = useCwToast();
	const alertPointsEditorText = createReportAlertPointsEditorText();

	let rowSequence = 0;
	function nextRowKey(prefix: string): string {
		rowSequence += 1;
		return `${prefix}-${rowSequence}`;
	}

	const drafts = createReportTemplateDraftFactory(nextRowKey);

	let fields = $state<ReportTemplateDraft>(
		initial
			? drafts.buildDraftFromTemplate(initial)
			: drafts.buildDefaultDraft(initialUserEmail, initialUserName)
	);
	let alertPointsValue = $state<CwAlertPointsValue>(
		initial ? drafts.buildAlertPointsValueFromTemplate(initial) : createEmptyAlertPointsValue()
	);
	let submitting = $state(false);
	let submitAttempted = $state(false);

	let selectedDevices = $state<DeviceSelection[]>(
		initial?.assignments.length
			? createDeviceSelections(initial.assignments.map((assignment) => assignment.devEui))
			: preselectedDevice
				? [createDeviceSelection(preselectedDevice)]
				: []
	);

	let communicationMethodOptions = $derived<SelectOption[]>(
		buildCommunicationMethodOptions(context.communicationMethods)
	);
	let daysOfTheWeek = $derived<SelectOption[]>([
		{ label: m.common_day_sunday(), value: '0' },
		{ label: m.common_day_monday(), value: '1' },
		{ label: m.common_day_tuesday(), value: '2' },
		{ label: m.common_day_wednesday(), value: '3' },
		{ label: m.common_day_thursday(), value: '4' },
		{ label: m.common_day_friday(), value: '5' },
		{ label: m.common_day_saturday(), value: '6' }
	]);
	let ruleTypeOptions = $derived<SelectOption[]>([
		{ label: m.reports_schedule_rule_type_include(), value: 'include' },
		{ label: m.reports_schedule_rule_type_exclude(), value: 'exclude' }
	]);

	interface DeviceOption {
		label: string;
		value: string;
		group?: number;
	}
	let deviceOptionsBase = $derived<DeviceOption[]>(
		(devices ?? []).map((device) => ({
			label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
			value: device.dev_eui,
			group: typeof device.location_id === 'number' ? device.location_id : undefined
		}))
	);
	let deviceOptions = $derived<DeviceOption[]>([
		...selectedDevices
			.filter((device) => !deviceOptionsBase.some((option) => option.value === device.id))
			.map((device) => ({
				label: device.label || getDeviceLabel(device.id),
				value: device.id
			})),
		...deviceOptionsBase
	]);
	let deviceGroups = $derived.by(() => {
		const seen = new Map<number, string>();
		for (const device of devices ?? []) {
			if (typeof device.location_id !== 'number' || seen.has(device.location_id)) continue;
			seen.set(device.location_id, resolveLocationName(device.location_id));
		}
		return [...seen.entries()]
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label));
	});

	let selectedDevEuis = $derived(selectedDevices.map((device) => device.id.trim()).filter(Boolean));
	let selectedDeviceTypeId = $derived(resolveSelectedDeviceTypeId());
	let dataPullIntervalOptions = $derived<SelectOption[]>([
		...buildReportDataPullIntervalOptions(fields.data_pull_interval)
	]);
	let validationIssues = $derived(buildValidationIssues(fields, selectedDevEuis, alertPointsValue));
	let canSubmit = $derived(validationIssues.length === 0);

	function buildCommunicationMethodOptions(methods: CommunicationMethodDto[]): SelectOption[] {
		const usable = (methods ?? []).filter((method) => method.isActive && method.name);
		if (usable.length === 0) {
			return [
				{ label: m.reports_create_method_email(), value: '1' },
				{ label: m.reports_create_method_sms(), value: '2' }
			];
		}
		return usable.map((method) => ({
			label: method.name ?? String(method.communicationMethodId),
			value: String(method.communicationMethodId)
		}));
	}

	function createDeviceSelection(devEui: string): DeviceSelection {
		return {
			id: devEui,
			label: getDeviceLabel(devEui)
		};
	}

	function createDeviceSelections(devEuis: string[]): DeviceSelection[] {
		const seen: string[] = [];
		return devEuis.flatMap((devEui) => {
			const id = devEui.trim();
			if (!id || seen.includes(id)) return [];
			seen.push(id);
			return [createDeviceSelection(id)];
		});
	}

	function getDeviceLabel(devEui: string): string {
		const device = devices.find((entry) => entry.dev_eui === devEui);
		return device?.name ? `${device.name} (${devEui})` : devEui;
	}

	function resolveLocationName(locationId: number): string {
		const match = locations.find((loc) => loc.location_id === locationId);
		const name = typeof match?.name === 'string' ? match.name.trim() : '';
		return name || m.locations_location_with_id({ id: String(locationId) });
	}

	function resolveSelectedDeviceTypeId(): number | null {
		const types: number[] = [];
		for (const devEui of selectedDevEuis) {
			const deviceType = devices.find((device) => device.dev_eui === devEui)?.type;
			if (typeof deviceType === 'number' && Number.isFinite(deviceType) && !types.includes(deviceType)) {
				types.push(deviceType);
			}
		}

		return types.length === 1 ? types[0] : null;
	}

	function addRecipient() {
		fields.recipients = [...fields.recipients, drafts.createEmptyRecipient()];
	}

	function removeRecipient(key: string) {
		fields.recipients = fields.recipients.filter((recipient) => recipient.key !== key);
	}

	function addDataProcessingSchedule() {
		fields.data_processing_schedules.push(drafts.createEmptyDataProcessingSchedule());
	}

	function removeDataProcessingSchedule(key: string) {
		const idx = fields.data_processing_schedules.findIndex((schedule) => schedule.key === key);
		if (idx >= 0) fields.data_processing_schedules.splice(idx, 1);
	}

	async function handleSubmit() {
		submitAttempted = true;
		if (!canSubmit || submitting) return;
		submitting = true;

		try {
			const api = new ApiService({ authToken });
			const payload = buildSaveRequest(fields, selectedDevEuis, alertPointsValue, selectedDeviceTypeId);

			if (mode === 'edit' && initial) {
				await api.updateReportTemplate(initial.id, payload);
				toast.add({
					tone: 'success',
					message: m.reports_new_updated_success({ name: fields.name.trim() }),
					duration: 4000,
					dismissible: true
				});
			} else {
				await api.createReportTemplate(payload);
				toast.add({
					tone: 'success',
					message: m.reports_new_created_success({ name: fields.name.trim() }),
					duration: 4000,
					dismissible: true
				});
			}

			await goto(resolve('/reports'));
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(error, m.reports_new_save_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			submitting = false;
		}
	}
</script>

{#if submitAttempted && validationIssues.length > 0}
	<AppNotice tone="warning" title={m.reports_create_validation_title()} ariaLive="polite">
		<div>
			<p>{m.reports_create_validation_copy()}</p>
		</div>
		<ul class="list-disc pl-5">
			{#each validationIssues as issue (issue)}
				<li>{issue}</li>
			{/each}
		</ul>
	</AppNotice>
{/if}

<CwCard title={m.reports_new_step_template()} subtitle={m.reports_new_step_template_subtitle()} elevated>
	<AppFormStack padded>
		<CwInput
			id="report-form-name-input"
			label={m.common_name()}
			placeholder={m.reports_create_name_placeholder()}
			bind:value={fields.name}
			required
		/>
		<CwTextArea
			id="report-form-description-textarea"
			label={m.common_description()}
			placeholder={m.reports_new_description_placeholder()}
			rows={3}
			resize="vertical"
			bind:value={fields.description}
		/>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<CwDropdown
				id="report-form-data-pull-interval-select"
				label={m.reports_new_data_pull_interval()}
				options={dataPullIntervalOptions}
				bind:value={fields.data_pull_interval}
			/>
		</div>
		<CwSwitch
			id="report-form-active-switch"
			label={m.reports_new_active_template()}
			description={m.reports_new_active_template_description()}
			bind:checked={fields.is_active}
		/>
	</AppFormStack>
</CwCard>

<CwCard
	title={m.reports_new_step_assignments()}
	subtitle={m.reports_new_step_assignments_subtitle()}
	elevated
>
	<AppFormStack padded>
		{#if deviceOptions.length === 0}
			<AppNotice tone="neutral">
				<p>{m.reports_create_no_devices_loaded()}</p>
			</AppNotice>
		{:else}
			<CwMultiSelect
				id="report-form-devices-multiselect"
				showAllSelectedItems={true}
				label={m.devices_device()}
				placeholder={m.rules_select_device_placeholder()}
				options={deviceOptions}
				groups={deviceGroups}
				dropdownHeight="24rem"
				searchPlaceholder={m.rules_filter_device_placeholder()}
				bind:value={selectedDevices}
				required
			/>
		{/if}
	</AppFormStack>
</CwCard>

<ReportCadenceSection bind:cadence={fields.cadence} />

<ReportProcessingSchedulesSection
	bind:schedules={fields.data_processing_schedules}
	{daysOfTheWeek}
	{ruleTypeOptions}
	onAdd={addDataProcessingSchedule}
	onRemove={removeDataProcessingSchedule}
/>

<CwCard title={m.reports_create_alerts_title()} elevated>
	<AppFormStack padded>
		<p class="text-[color:var(--cw-text-secondary)]">{m.reports_create_alerts_copy()}</p>
		<CwAlertPointsEditor bind:value={alertPointsValue} text={alertPointsEditorText} />
	</AppFormStack>
</CwCard>

<ReportRecipientsSection
	bind:recipients={fields.recipients}
	{communicationMethodOptions}
	onAdd={addRecipient}
	onRemove={removeRecipient}
/>

<CwCard elevated>
	<AppFormStack padded>
		<CwSeparator />
		<AppActionRow>
			<CwButton id="report-form-cancel-button" variant="ghost" onclick={() => goto(resolve('/reports'))} disabled={submitting}>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				id="report-form-submit-button"
				variant="primary"
				onclick={handleSubmit}
				disabled={!canSubmit || submitting}
				loading={submitting}
			>
				{submitting
					? m.action_saving()
					: mode === 'edit'
						? m.action_save_changes()
						: m.reports_new_create_template()}
			</CwButton>
		</AppActionRow>
	</AppFormStack>
</CwCard>
