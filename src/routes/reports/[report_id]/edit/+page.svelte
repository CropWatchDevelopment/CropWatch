<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import {
		CwAlertPointsEditor,
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
	import type { DeviceDto } from '$lib/api/api.dtos';
	import type { PageProps } from './$types';
	import ReportCadenceSection from './ReportCadenceSection.svelte';
	import ReportProcessingSchedulesSection from './ReportProcessingSchedulesSection.svelte';
	import ReportRecipientsSection from './ReportRecipientsSection.svelte';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import CANCEL_ICON from '$lib/images/icons/no.svg';
	import type { ReportDraft, SelectOption } from './report-form.types';
	import { createReportAlertPointsEditorText } from './alert-points-editor-text';
	import { buildReportDataPullIntervalOptions } from './data-pull-interval';
	import {
		buildRequestPayload,
		buildValidationIssues,
		cleanOptional,
		createEmptyAlertPointsValue,
		createReportDraftFactory,
		normalizeDevEui,
		preventImplicitFormSubmission,
		type CurrentUser
	} from './report-form';

	type ReportForm = {
		error?: string;
		message?: string;
		payload?: string;
		report_id?: string;
		success?: boolean;
	} | null;

	type DeviceListEntry = {
		dev_eui: string;
		name?: string | null;
	};

	const REPORT_CREATED_SUCCESS_MESSAGE = 'Report created successfully.';
	const REPORT_UPDATED_SUCCESS_MESSAGE = 'Report updated successfully.';

	const toast = useCwToast();
	const app = getAppContext();

	let { data, form }: PageProps = $props();
	const report = (() => data.report ?? null)();
	const isEditing = report !== null;
	const authToken = (() => data.authToken ?? null)();
	const serverDevices = (() => data.devices ?? [])();
	const currentUser = (() => (data.currentUser ?? null) as CurrentUser)();
	const initialDevEui = (() => data.devEui ?? '')();
	let actionForm = $derived((form ?? null) as ReportForm);
	let communicationMethodOptions = $derived<SelectOption[]>([
		{ label: m.reports_create_method_email(), value: '1' },
		{ label: m.reports_create_method_sms(), value: '2' },
		{ label: m.reports_create_method_discord(), value: '3' }
	]);
	let daysOfTheWeek = $derived<SelectOption[]>([
		{ label: m.common_day_sunday(), value: '0' },
		{ label: m.common_day_monday(), value: '1' },
		{ label: m.common_day_tuesday(), value: '2' },
		{ label: m.common_day_wednesday(), value: '3' },
		{ label: m.common_day_thursday(), value: '4' },
		{ label: m.common_day_friday(), value: '5' },
		{ label: m.common_day_saturday(), value: '6' }
	]);
	let dataProcessingRuleTypeOptions = $derived<SelectOption[]>([
		{ label: m.reports_schedule_rule_type_include(), value: 'include' },
		{ label: m.reports_schedule_rule_type_exclude(), value: 'exclude' }
	]);

	let submitting = $state(false);
	let submitAttempted = $state(false);
	let rowSequence = 0;

	function nextRowKey(prefix: string): string {
		rowSequence += 1;
		return `${prefix}-${rowSequence}`;
	}

	const reportDrafts = createReportDraftFactory({
		currentUser,
		initialDevEui,
		nextRowKey,
		report
	});

	function addDataProcessingSchedule() {
		fields.report_data_processing_schedules.push(reportDrafts.createEmptyDataProcessingSchedule());
	}

	function removeDataProcessingSchedule(key: string) {
		const idx = fields.report_data_processing_schedules.findIndex((s) => s.key === key);
		if (idx >= 0) fields.report_data_processing_schedules.splice(idx, 1);
	}

	function addRecipient() {
		fields.report_recipients = [
			...fields.report_recipients,
			reportDrafts.createEmptyRecipient(fields.user_id)
		];
	}

	function removeRecipient(key: string) {
		fields.report_recipients = fields.report_recipients.filter(
			(recipient) => recipient.key !== key
		);
	}

	let fields = $state<ReportDraft>(
		report ? reportDrafts.buildDraftFromReport(report) : reportDrafts.buildDefaultDraft()
	);
	let alertPointsValue = $state<CwAlertPointsValue>(
		report ? reportDrafts.buildAlertPointsValueFromReport(report) : createEmptyAlertPointsValue()
	);
	let fallbackDevices = $state<DeviceDto[]>([]);
	let loadingDevices = $state(false);
	let selectedDevEui = $state(
		report ? normalizeDevEui(report.dev_eui ?? '') : normalizeDevEui(initialDevEui)
	);

	async function loadDevicesFromApi() {
		if (!authToken || loadingDevices) return;

		loadingDevices = true;

		try {
			const api = new ApiService({ authToken });
			const devices = await api.getAllDevices();

			if (devices.length > 0) {
				fallbackDevices = devices;
			}
		} catch (sourceError) {
			console.error('Failed to load devices:', sourceError);
		} finally {
			loadingDevices = false;
		}
	}

	onMount(() => {
		if (!selectedDevEui) {
			selectedDevEui = normalizeDevEui(fields.dev_eui);
		}

		if (app.devices.length === 0 && serverDevices.length === 0 && authToken) {
			void loadDevicesFromApi();
		}
	});

	let availableDevices = $derived.by<DeviceListEntry[]>(() => {
		const baseDevices =
			app.devices.length > 0
				? app.devices
				: fallbackDevices.length > 0
					? fallbackDevices
					: serverDevices;
		const normalizedCurrentDevEui = normalizeDevEui(report?.dev_eui ?? fields.dev_eui);
		const merged: DeviceListEntry[] = (baseDevices ?? []).map((device) => ({
			dev_eui: device.dev_eui,
			name: device.name
		}));

		if (
			normalizedCurrentDevEui &&
			!merged.some((device) => normalizeDevEui(device.dev_eui) === normalizedCurrentDevEui)
		) {
			merged.unshift({
				dev_eui: normalizedCurrentDevEui
			});
		}

		return merged;
	});
	let normalizedSelectedDevEui = $derived(normalizeDevEui(selectedDevEui));
	let deviceOptions = $derived.by<SelectOption[]>(() => {
		const optionsByValue: Record<string, SelectOption> = {};

		for (const device of availableDevices) {
			const devEui = normalizeDevEui(device.dev_eui);
			if (!devEui || optionsByValue[devEui]) continue;

			optionsByValue[devEui] = {
				label: device.name ? `${device.name} (${devEui})` : devEui,
				value: devEui
			};
		}

		return Object.values(optionsByValue).sort((left, right) =>
			left.label.localeCompare(right.label)
		);
	});
	let dataPullIntervalOptions = $derived.by<SelectOption[]>(() => [
		...buildReportDataPullIntervalOptions(fields.data_pull_interval)
	]);
	let requestPayload = $derived.by(() =>
		buildRequestPayload(fields, normalizedSelectedDevEui, alertPointsValue, currentUser)
	);
	let requestPayloadCompact = $derived.by(() => JSON.stringify(requestPayload));
	let validationIssues = $derived.by(() =>
		buildValidationIssues(fields, normalizedSelectedDevEui, alertPointsValue, currentUser)
	);
	let alertPointsEditorText = $derived.by(() => createReportAlertPointsEditorText());
	let canSubmit = $derived(validationIssues.length === 0);
</script>

<svelte:head>
	<title
		>{isEditing ? m.reports_edit_page_title() : m.reports_create_page_title()} | CropWatch</title
	>
</svelte:head>

<AppPage width="xl" class="report-page">
	<div class="report-page__shell">
		<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/reports'))}>
			&larr; {m.action_back()}
		</CwButton>

		<form
			method="POST"
			class="flex flex-col gap-4"
			{@attach preventImplicitFormSubmission}
			use:enhance={({ cancel }) => {
				submitAttempted = true;

				if (!canSubmit) {
					cancel();
					toast.add({
						tone: 'danger',
						message: validationIssues[0] ?? m.reports_create_invalid_toast()
					});
					return;
				}

				submitting = true;

				return async ({ result }) => {
					submitting = false;

					if (result.type === 'success') {
						toast.add({
							tone: 'success',
							message:
								typeof result.data?.message === 'string'
									? result.data.message
									: isEditing
										? REPORT_UPDATED_SUCCESS_MESSAGE
										: REPORT_CREATED_SUCCESS_MESSAGE
						});
						await goto(resolve('/reports'), { invalidateAll: true });
						return;
					}

					await applyAction(result);

					if (result.type === 'failure' && typeof result.data?.error === 'string') {
						toast.add({ tone: 'danger', message: result.data.error });
						return;
					}

					if (result.type === 'error') {
						toast.add({
							tone: 'danger',
							message: isEditing ? REPORT_UPDATED_SUCCESS_MESSAGE : REPORT_CREATED_SUCCESS_MESSAGE
						});
					}
				};
			}}
		>
			<input type="hidden" name="payload" value={requestPayloadCompact} />

			{#if actionForm?.error}
				<AppNotice tone="danger">
					<p>{actionForm.error}</p>
				</AppNotice>
			{/if}

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

			<CwCard
				title={m.reports_create_basics_title()}
				subtitle={m.reports_create_basics_subtitle()}
				elevated
			>
				<AppFormStack padded>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<CwInput
							label={m.common_name()}
							required
							placeholder={m.reports_create_name_placeholder()}
							bind:value={fields.name}
						/>

						<CwDropdown
							label={m.devices_device()}
							placeholder={m.reports_create_device_placeholder()}
							options={deviceOptions}
							bind:value={selectedDevEui}
							disabled={deviceOptions.length === 0 || loadingDevices}
						/>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<CwDropdown
							label="Data pull interval"
							options={dataPullIntervalOptions}
							bind:value={fields.data_pull_interval}
						/>
					</div>

					{#if !loadingDevices && deviceOptions.length === 0}
						<AppNotice tone="neutral">
							<p>{m.reports_create_no_devices_loaded()}</p>
						</AppNotice>
					{/if}
				</AppFormStack>
			</CwCard>

			<ReportCadenceSection bind:schedules={fields.report_user_schedule} />

			<ReportProcessingSchedulesSection
				bind:schedules={fields.report_data_processing_schedules}
				{daysOfTheWeek}
				ruleTypeOptions={dataProcessingRuleTypeOptions}
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
				bind:recipients={fields.report_recipients}
				{communicationMethodOptions}
				onAdd={addRecipient}
				onRemove={removeRecipient}
			/>

			<CwCard elevated>
				<AppFormStack padded>
					<AppActionRow>
						<CwButton type="button" variant="secondary" onclick={() => goto(resolve('/reports'))}>
							<Icon src={CANCEL_ICON} class="h-4 w-4" />
							{m.action_cancel()}
						</CwButton>
						<CwButton type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
							<Icon src={SAVE_ICON} class="h-4 w-4" />
							{#if submitting}
								{m.action_saving()}
							{:else if isEditing}
								{m.action_save_changes()}
							{:else}
								{m.reports_create_submit()}
							{/if}
						</CwButton>
					</AppActionRow>
				</AppFormStack>
			</CwCard>
		</form>
	</div>
</AppPage>

<style>
	.report-page__shell {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}
</style>
