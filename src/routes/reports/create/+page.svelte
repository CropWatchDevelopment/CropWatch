<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { onMount } from 'svelte';
	import {
		CwButton,
		CwCard,
		CwDropdown,
		CwExpandPanel,
		CwInput,
		CwSwitch,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type {
		CreateReportAlertPointRequest,
		CreateReportRecipientRequest,
		CreateReportRequest,
		CreateReportUserScheduleRequest,
		DeviceDto
	} from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	type CreateReportForm = {
		error?: string;
		payload?: string;
		report_id?: string;
		success?: boolean;
	} | null;

	type CurrentUser = {
		email: string;
		id: string;
		name: string;
	} | null;

	type SelectOption = {
		disabled?: boolean;
		label: string;
		value: string;
	};

	type DeviceListEntry = {
		dev_eui: string;
		name?: string | null;
	};

	type ScheduleDraft = {
		created_at: string;
		dev_eui: string;
		end_of_month: boolean;
		end_of_week: boolean;
		id: string;
		is_active: boolean;
		key: string;
		report_id: string;
		report_user_schedule_id: string;
		user_id: string;
	};

	type AlertDraft = {
		created_at: string;
		data_point_key: string;
		hex_color: string;
		id: string;
		key: string;
		max: string;
		min: string;
		name: string;
		operator: string;
		report_id: string;
		user_id: string;
		value: string;
	};

	type RecipientDraft = {
		communication_method: string;
		created_at: string;
		email: string;
		id: string;
		key: string;
		name: string;
		report_id: string;
		user_id: string;
	};

	type ReportDraft = {
		created_at: string;
		dev_eui: string;
		id: string;
		name: string;
		report_alert_points: AlertDraft[];
		report_id: string;
		report_recipients: RecipientDraft[];
		report_user_schedule: ScheduleDraft[];
		user_id: string;
	};

	const ISO_TIMESTAMP_PLACEHOLDER = '2026-03-19T15:49:41.027Z';
	const UUID_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
	const NUMBER_PLACEHOLDER = '0';

	const DATA_POINT_KEYS = [
		'battery_level',
		'bicycle_count',
		'bus_count',
		'car_count',
		'co',
		'co2',
		'current',
		'deapth_cm',
		'ec',
		'humidity',
		'id',
		'is_simulated',
		'line_number',
		'lux',
		'moisture',
		'motorcycle_count',
		'people_count',
		'ph',
		'pressure',
		'rainfall',
		'smoke_detected',
		'spo2',
		'temperature_c',
		'traffic_hour',
		'train_count',
		'truck_count',
		'uv_index',
		'vape_detected',
		'voltage',
		'watts',
		'wind_direction',
		'wind_speed'
	];

	function humanizeMetricKey(value: string): string {
		return value
			.split('_')
			.map((part) =>
				part.length <= 2 ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`
			)
			.join(' ');
	}

	function getMetricKeyLabel(value: string): string {
		switch (value) {
			case 'battery_level':
				return m.rule_subject_battery_level();
			case 'co':
				return m.rule_subject_co();
			case 'co2':
				return m.rule_subject_co2();
			case 'deapth_cm':
				return m.rule_subject_water_depth();
			case 'ec':
				return m.rule_subject_electrical_conductivity();
			case 'humidity':
				return m.rule_subject_humidity();
			case 'lux':
				return m.rule_subject_lux();
			case 'moisture':
				return m.rule_subject_soil_moisture();
			case 'ph':
				return m.rule_subject_ph();
			case 'pressure':
				return m.rule_subject_pressure();
			case 'rainfall':
				return m.rule_subject_rainfall();
			case 'spo2':
				return m.rule_subject_spo2();
			case 'temperature_c':
				return m.rule_subject_temperature();
			case 'uv_index':
				return m.rule_subject_uv_index();
			case 'wind_direction':
				return m.rule_subject_wind_direction();
			case 'wind_speed':
				return m.rule_subject_wind_speed();
			default:
				return humanizeMetricKey(value);
		}
	}

	const toast = useCwToast();
	const app = getAppContext();

	let { data, form }: PageProps = $props();
	let actionForm = $derived((form ?? null) as CreateReportForm);
	let currentUser = $derived((data.currentUser ?? null) as CurrentUser);
	let alertOperatorOptions = $derived<SelectOption[]>([
		{ label: m.reports_create_operator_gt(), value: '>' },
		{ label: m.reports_create_operator_gte(), value: '>=' },
		{ label: m.reports_create_operator_lt(), value: '<' },
		{ label: m.reports_create_operator_lte(), value: '<=' },
		{ label: m.reports_create_operator_eq(), value: '=' },
		{ label: m.reports_create_operator_range(), value: 'range' }
	]);
	let communicationMethodOptions = $derived<SelectOption[]>([
		{ label: m.reports_create_method_email(), value: '1' },
		{ label: m.reports_create_method_sms(), value: '2' },
		{ label: m.reports_create_method_discord(), value: '3' }
	]);
	let dataPointOptions = $derived<SelectOption[]>(
		DATA_POINT_KEYS.map((value) => ({
			label: getMetricKeyLabel(value),
			value
		}))
	);

	let submitting = $state(false);
	let submitAttempted = $state(false);
	let rowSequence = 0;

	function nextRowKey(prefix: string): string {
		rowSequence += 1;
		return `${prefix}-${rowSequence}`;
	}

	function normalizeDevEui(value: string): string {
		return value
			.replace(/[^0-9a-fA-F]/g, '')
			.toUpperCase()
			.slice(0, 16);
	}

	function cleanOptional(value: string): string | undefined {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	function parseOptionalInteger(value: string): number | undefined {
		const normalized = cleanOptional(value);
		if (!normalized) return undefined;

		const parsed = Number.parseInt(normalized, 10);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	function parseOptionalNumber(value: string): number | undefined {
		const normalized = cleanOptional(value);
		if (!normalized) return undefined;

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	function createEmptySchedule(): ScheduleDraft {
		return {
			created_at: '',
			dev_eui: '',
			end_of_month: false,
			end_of_week: true,
			id: '',
			is_active: true,
			key: nextRowKey('schedule'),
			report_id: '',
			report_user_schedule_id: '',
			user_id: currentUser?.id ?? ''
		};
	}

	function createEmptyAlert(): AlertDraft {
		return {
			created_at: '',
			data_point_key: 'temperature_c',
			hex_color: '#0F766E',
			id: '',
			key: nextRowKey('alert'),
			max: '',
			min: '',
			name: '',
			operator: '>',
			report_id: '',
			user_id: currentUser?.id ?? '',
			value: ''
		};
	}

	function createEmptyRecipient(): RecipientDraft {
		return {
			communication_method: '1',
			created_at: '',
			email: currentUser?.email ?? '',
			id: '',
			key: nextRowKey('recipient'),
			name: currentUser?.name ?? '',
			report_id: '',
			user_id: currentUser?.id ?? ''
		};
	}

	function buildDefaultDraft(): ReportDraft {
		return {
			created_at: '',
			dev_eui: normalizeDevEui(data.devEui ?? ''),
			id: '',
			name: '',
			report_alert_points: [],
			report_id: '',
			report_recipients: [createEmptyRecipient()],
			report_user_schedule: [createEmptySchedule()],
			user_id: currentUser?.id ?? ''
		};
	}

	function buildRequestPayload(draft: ReportDraft, rootDevEui: string): CreateReportRequest {
		const createdAt = cleanOptional(draft.created_at);
		const id = parseOptionalInteger(draft.id);
		const reportId = cleanOptional(draft.report_id);
		const userId = cleanOptional(draft.user_id) ?? currentUser?.id ?? undefined;
		const devEui = normalizeDevEui(rootDevEui);

		const reportUserSchedule: CreateReportUserScheduleRequest[] = draft.report_user_schedule.map(
			(schedule) => {
				const schedulePayload: CreateReportUserScheduleRequest = {
					dev_eui: normalizeDevEui(schedule.dev_eui) || devEui,
					end_of_month: schedule.end_of_month,
					end_of_week: schedule.end_of_week,
					is_active: schedule.is_active
				};

				const scheduleCreatedAt = cleanOptional(schedule.created_at);
				const scheduleId = parseOptionalInteger(schedule.id);
				const scheduleReportId = cleanOptional(schedule.report_id) ?? reportId;
				const scheduleRowId = parseOptionalInteger(schedule.report_user_schedule_id);
				const scheduleUserId = cleanOptional(schedule.user_id) ?? userId;

				if (scheduleCreatedAt) schedulePayload.created_at = scheduleCreatedAt;
				if (scheduleId !== undefined) schedulePayload.id = scheduleId;
				if (scheduleReportId) schedulePayload.report_id = scheduleReportId;
				if (scheduleRowId !== undefined) schedulePayload.report_user_schedule_id = scheduleRowId;
				if (scheduleUserId) schedulePayload.user_id = scheduleUserId;

				return schedulePayload;
			}
		);

		const reportAlertPoints: CreateReportAlertPointRequest[] = draft.report_alert_points.map(
			(alert) => {
				const alertPayload: CreateReportAlertPointRequest = {
					data_point_key: alert.data_point_key.trim(),
					name: alert.name.trim()
				};

				const alertCreatedAt = cleanOptional(alert.created_at);
				const alertHexColor = cleanOptional(alert.hex_color)?.toUpperCase();
				const alertId = parseOptionalInteger(alert.id);
				const alertMax = parseOptionalNumber(alert.max);
				const alertMin = parseOptionalNumber(alert.min);
				const alertOperator = cleanOptional(alert.operator);
				const alertReportId = cleanOptional(alert.report_id) ?? reportId;
				const alertUserId = cleanOptional(alert.user_id) ?? userId;
				const alertValue = parseOptionalNumber(alert.value);

				if (alertCreatedAt) alertPayload.created_at = alertCreatedAt;
				if (alertHexColor) alertPayload.hex_color = alertHexColor;
				if (alertId !== undefined) alertPayload.id = alertId;
				if (alertMax !== undefined) alertPayload.max = alertMax;
				if (alertMin !== undefined) alertPayload.min = alertMin;
				if (alertOperator) alertPayload.operator = alertOperator;
				if (alertReportId) alertPayload.report_id = alertReportId;
				if (alertUserId) alertPayload.user_id = alertUserId;
				if (alertValue !== undefined) alertPayload.value = alertValue;

				return alertPayload;
			}
		);

		const reportRecipients: CreateReportRecipientRequest[] = draft.report_recipients.map(
			(recipient) => {
				const recipientPayload: CreateReportRecipientRequest = {
					communication_method: parseOptionalInteger(recipient.communication_method) ?? 1
				};

				const recipientCreatedAt = cleanOptional(recipient.created_at);
				const recipientEmail = cleanOptional(recipient.email);
				const recipientId = parseOptionalInteger(recipient.id);
				const recipientName = cleanOptional(recipient.name);
				const recipientReportId = cleanOptional(recipient.report_id) ?? reportId;
				const recipientUserId = cleanOptional(recipient.user_id) ?? userId;

				if (recipientCreatedAt) recipientPayload.created_at = recipientCreatedAt;
				if (recipientEmail) recipientPayload.email = recipientEmail;
				if (recipientId !== undefined) recipientPayload.id = recipientId;
				if (recipientName) recipientPayload.name = recipientName;
				if (recipientReportId) recipientPayload.report_id = recipientReportId;
				if (recipientUserId) recipientPayload.user_id = recipientUserId;

				return recipientPayload;
			}
		);

		const payload: CreateReportRequest = {
			dev_eui: devEui,
			name: draft.name.trim(),
			report_alert_points: reportAlertPoints,
			report_recipients: reportRecipients,
			report_user_schedule: reportUserSchedule
		};

		if (createdAt) payload.created_at = createdAt;
		if (id !== undefined) payload.id = id;
		if (reportId) payload.report_id = reportId;
		if (userId) payload.user_id = userId;

		return payload;
	}

	function buildValidationIssues(draft: ReportDraft, rootDevEui: string): string[] {
		const issues: string[] = [];
		const normalizedRootDevEui = normalizeDevEui(rootDevEui);
		const rootUserId = cleanOptional(draft.user_id) ?? currentUser?.id ?? undefined;

		if (!draft.name.trim()) {
			issues.push(m.reports_create_validation_report_name_required());
		}

		if (normalizedRootDevEui.length !== 16) {
			issues.push(m.reports_create_validation_dev_eui_length());
		}

		draft.report_user_schedule.forEach((schedule, index) => {
			const scheduleDevEui = normalizeDevEui(schedule.dev_eui) || normalizedRootDevEui;
			const rowIndex = String(index + 1);

			if (scheduleDevEui.length !== 16) {
				issues.push(m.reports_create_validation_schedule_dev_eui({ index: rowIndex }));
			}

			if (schedule.is_active && !schedule.end_of_week && !schedule.end_of_month) {
				issues.push(m.reports_create_validation_schedule_cadence({ index: rowIndex }));
			}
		});

		draft.report_alert_points.forEach((alert, index) => {
			const rowIndex = String(index + 1);

			if (!alert.name.trim()) {
				issues.push(m.reports_create_validation_alert_name({ index: rowIndex }));
			}

			if (!alert.data_point_key.trim()) {
				issues.push(m.reports_create_validation_alert_metric({ index: rowIndex }));
			}

			if (!alert.operator.trim()) {
				issues.push(m.reports_create_validation_alert_operator({ index: rowIndex }));
			}

			if (alert.operator === 'range') {
				const min = parseOptionalNumber(alert.min);
				const max = parseOptionalNumber(alert.max);

				if (min === undefined || max === undefined) {
					issues.push(m.reports_create_validation_alert_range_required({ index: rowIndex }));
				} else if (min > max) {
					issues.push(m.reports_create_validation_alert_range_order({ index: rowIndex }));
				}
			} else if (parseOptionalNumber(alert.value) === undefined) {
				issues.push(m.reports_create_validation_alert_value({ index: rowIndex }));
			}

			const hexColor = cleanOptional(alert.hex_color);
			if (hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
				issues.push(m.reports_create_validation_alert_hex({ index: rowIndex }));
			}
		});

		draft.report_recipients.forEach((recipient, index) => {
			const rowIndex = String(index + 1);
			const communicationMethod = parseOptionalInteger(recipient.communication_method);
			const email = cleanOptional(recipient.email);
			const userId = cleanOptional(recipient.user_id) ?? rootUserId;

			if (!communicationMethod) {
				issues.push(m.reports_create_validation_recipient_method({ index: rowIndex }));
			}

			if (!email && !userId) {
				issues.push(m.reports_create_validation_recipient_destination({ index: rowIndex }));
			}

			if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				issues.push(m.reports_create_validation_recipient_email({ index: rowIndex }));
			}
		});

		return issues;
	}

	function addSchedule() {
		fields.report_user_schedule = [...fields.report_user_schedule, createEmptySchedule()];
	}

	function removeSchedule(key: string) {
		fields.report_user_schedule = fields.report_user_schedule.filter(
			(schedule) => schedule.key !== key
		);
	}

	function addAlert() {
		fields.report_alert_points = [...fields.report_alert_points, createEmptyAlert()];
	}

	function removeAlert(key: string) {
		fields.report_alert_points = fields.report_alert_points.filter((alert) => alert.key !== key);
	}

	function addRecipient() {
		fields.report_recipients = [...fields.report_recipients, createEmptyRecipient()];
	}

	function removeRecipient(key: string) {
		fields.report_recipients = fields.report_recipients.filter(
			(recipient) => recipient.key !== key
		);
	}

	let fields = $state<ReportDraft>(buildDefaultDraft());
	let fallbackDevices = $state<DeviceDto[]>([]);
	let loadingDevices = $state(false);
	let selectedDevEui = $state('');

	async function loadDevicesFromApi() {
		if (!data.authToken || loadingDevices) return;

		loadingDevices = true;

		try {
			const api = new ApiService({ authToken: data.authToken });
			const devices = await api.getAllDevices();

			if (devices.length > 0) {
				fallbackDevices = devices;
			}
		} catch (error) {
			console.error('Failed to load devices for report creation:', error);
		} finally {
			loadingDevices = false;
		}
	}

	onMount(() => {
		const initialDevEui = normalizeDevEui(data.devEui ?? '');
		if (initialDevEui && !selectedDevEui) {
			selectedDevEui = initialDevEui;
		}

		if (app.devices.length === 0 && (data.devices?.length ?? 0) === 0 && data.authToken) {
			void loadDevicesFromApi();
		}
	});

	let availableDevices = $derived.by<DeviceListEntry[]>(() => {
		if (app.devices.length > 0) {
			return app.devices;
		}

		if (fallbackDevices.length > 0) {
			return fallbackDevices;
		}

		return data.devices ?? [];
	});
	let normalizedSelectedDevEui = $derived(normalizeDevEui(selectedDevEui));
	let deviceOptions = $derived(
		availableDevices
			.map((device) => ({
				label: device.name ? `${device.name} (${device.dev_eui})` : device.dev_eui,
				value: device.dev_eui
			}))
			.sort((left, right) => left.label.localeCompare(right.label))
	);
	let requestPayload = $derived.by(() => buildRequestPayload(fields, normalizedSelectedDevEui));
	let requestPayloadCompact = $derived.by(() => JSON.stringify(requestPayload));
	let validationIssues = $derived.by(() => buildValidationIssues(fields, normalizedSelectedDevEui));
	let canSubmit = $derived(validationIssues.length === 0);
</script>

<svelte:head>
	<title>{m.reports_create_page_title()} | CropWatch</title>
</svelte:head>

<div class="create-report-page overflow-y-auto p-4">
	<div class="page-shell">
		<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/reports'))}>
			{m.action_back()}
		</CwButton>

		<form
			method="POST"
			class="report-form"
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
							message: m.reports_create_success_toast()
						});
						await goto(resolve('/reports'), { invalidateAll: true });
						return;
					}

					await applyAction(result);

					if (result.type === 'failure' && typeof result.data?.error === 'string') {
						toast.add({ tone: 'danger', message: result.data.error });
					}
				};
			}}
		>
			<input type="hidden" name="payload" value={requestPayloadCompact} />

			{#if actionForm?.error}
				<p class="form-error">{actionForm.error}</p>
			{/if}

			{#if submitAttempted && validationIssues.length > 0}
				<div class="validation-panel" aria-live="polite">
					<div>
						<p class="validation-panel__title">{m.reports_create_validation_title()}</p>
						<p class="validation-panel__copy">{m.reports_create_validation_copy()}</p>
					</div>

					<ul class="validation-list">
						{#each validationIssues as issue (issue)}
							<li>{issue}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<CwCard
				title={m.reports_create_basics_title()}
				subtitle={m.reports_create_basics_subtitle()}
				elevated
			>
				<div class="card-stack">
					<div class="field-grid field-grid--two">
						<CwInput
							label={m.common_name()}
							required
							placeholder={m.reports_create_name_placeholder()}
							bind:value={fields.name}
						/>

						<!-- <CwInput
							label={m.devices_dev_eui_label()}
							type="devEui"
							required
							placeholder={DEV_EUI_PLACEHOLDER}
							bind:value={fields.dev_eui}
						/> -->

						<CwDropdown
							label={m.devices_device()}
							placeholder={m.reports_create_device_placeholder()}
							options={deviceOptions}
							bind:value={selectedDevEui}
							disabled={deviceOptions.length === 0 || loadingDevices}
						/>
					</div>

					{#if !loadingDevices && deviceOptions.length === 0}
						<p class="hint">{m.reports_create_no_devices_loaded()}</p>
					{/if}

					<!-- <CwExpandPanel title={m.reports_create_advanced_report_metadata()}>
						<div class="meta-grid">
							<CwInput
								label={m.reports_created_at()}
								placeholder={ISO_TIMESTAMP_PLACEHOLDER}
								bind:value={fields.created_at}
							/>
							<CwInput
								label={m.reports_create_field_id()}
								type="numeric"
								placeholder={NUMBER_PLACEHOLDER}
								bind:value={fields.id}
							/>
							<CwInput
								label={m.reports_create_field_report_id()}
								placeholder={UUID_PLACEHOLDER}
								bind:value={fields.report_id}
							/>
							<CwInput
								label={m.reports_create_field_user_id()}
								placeholder={UUID_PLACEHOLDER}
								bind:value={fields.user_id}
							/>
						</div>
						<p class="hint">{m.reports_create_advanced_report_metadata_hint()}</p>
					</CwExpandPanel> -->
				</div>
			</CwCard>

			<CwCard
				title={m.reports_create_schedules_title()}
				subtitle={m.reports_create_schedules_subtitle()}
				elevated
			>
				<div class="card-stack">
					<div class="section-toolbar">
						<p class="section-copy">{m.reports_create_schedules_copy()}</p>
						<CwButton type="button" variant="secondary" onclick={addSchedule}
							>{m.reports_create_add_schedule()}</CwButton
						>
					</div>

					{#if fields.report_user_schedule.length === 0}
						<div class="empty-panel">{m.reports_create_empty_schedules()}</div>
					{/if}

					{#each fields.report_user_schedule as schedule, index (schedule.key)}
						<div class="entry-card">
							<div class="entry-card__header">
								<div>
									<h3>{m.reports_create_schedule_heading({ index: String(index + 1) })}</h3>
									<p>{m.reports_create_schedule_copy()}</p>
								</div>
								<CwButton
									type="button"
									variant="danger"
									size="sm"
									onclick={() => removeSchedule(schedule.key)}
								>
									{m.action_remove()}
								</CwButton>
							</div>

							<div class="switch-grid">
								<CwSwitch
									checked={schedule.is_active}
									label={m.reports_create_schedule_active_label()}
									description={m.reports_create_schedule_active_description()}
									onchange={(checked) => (schedule.is_active = checked)}
								/>
								<CwSwitch
									checked={schedule.end_of_week}
									label={m.reports_create_schedule_week_label()}
									description={m.reports_create_schedule_week_description()}
									onchange={(checked) => (schedule.end_of_week = checked)}
								/>
								<CwSwitch
									checked={schedule.end_of_month}
									label={m.reports_create_schedule_month_label()}
									description={m.reports_create_schedule_month_description()}
									onchange={(checked) => (schedule.end_of_month = checked)}
								/>
							</div>

							<!-- <div class="field-grid field-grid--two">
								<CwInput
									label={m.reports_create_schedule_child_device_label()}
									type="devEui"
									placeholder={m.reports_create_schedule_child_device_placeholder()}
									bind:value={schedule.dev_eui}
								/>
								<CwInput
									label={m.reports_create_schedule_user_label()}
									placeholder={m.reports_create_schedule_user_placeholder()}
									bind:value={schedule.user_id}
								/>
							</div>

							<CwExpandPanel title={m.reports_create_advanced_schedule_metadata()}>
								<div class="meta-grid">
									<CwInput
										label={m.reports_created_at()}
										placeholder={ISO_TIMESTAMP_PLACEHOLDER}
										bind:value={schedule.created_at}
									/>
									<CwInput
										label={m.reports_create_field_id()}
										type="numeric"
										placeholder={NUMBER_PLACEHOLDER}
										bind:value={schedule.id}
									/>
									<CwInput
										label={m.reports_create_field_schedule_id()}
										type="numeric"
										placeholder={NUMBER_PLACEHOLDER}
										bind:value={schedule.report_user_schedule_id}
									/>
									<CwInput
										label={m.reports_create_field_report_id()}
										placeholder={UUID_PLACEHOLDER}
										bind:value={schedule.report_id}
									/>
								</div>
							</CwExpandPanel> -->
						</div>
					{/each}
				</div>
			</CwCard>

			<CwCard
				title={m.reports_create_alerts_title()}
				subtitle={m.reports_create_alerts_subtitle()}
				elevated
			>
				<div class="card-stack">
					<div class="section-toolbar">
						<p class="section-copy">{m.reports_create_alerts_copy()}</p>
						<CwButton type="button" variant="secondary" onclick={addAlert}
							>{m.reports_create_add_alert()}</CwButton
						>
					</div>

					{#if fields.report_alert_points.length === 0}
						<div class="empty-panel">{m.reports_create_empty_alerts()}</div>
					{/if}

					{#each fields.report_alert_points as alert, index (alert.key)}
						<div class="entry-card">
							<div class="entry-card__header">
								<div>
									<h3>{m.reports_create_alert_heading({ index: String(index + 1) })}</h3>
									<p>{m.reports_create_alert_copy()}</p>
								</div>
								<CwButton
									type="button"
									variant="danger"
									size="sm"
									onclick={() => removeAlert(alert.key)}
								>
									{m.action_remove()}
								</CwButton>
							</div>

							<div class="field-grid field-grid--three">
								<CwInput
									label={m.common_name()}
									placeholder={m.reports_create_alert_name_placeholder()}
									bind:value={alert.name}
								/>
								<CwDropdown
									label={m.reports_create_alert_metric_key()}
									options={dataPointOptions}
									bind:value={alert.data_point_key}
								/>
								<CwDropdown
									label={m.reports_create_alert_operator()}
									options={alertOperatorOptions}
									bind:value={alert.operator}
								/>
							</div>

							<div class="field-grid field-grid--three">
								{#if alert.operator === 'range'}
									<CwInput
										label={m.reports_create_alert_minimum()}
										type="numeric"
										placeholder="18"
										bind:value={alert.min}
									/>
									<CwInput
										label={m.reports_create_alert_maximum()}
										type="numeric"
										placeholder="26"
										bind:value={alert.max}
									/>
								{:else}
									<CwInput
										label={m.reports_create_alert_value()}
										type="numeric"
										placeholder="30"
										bind:value={alert.value}
									/>
								{/if}

								<CwInput
									label={m.reports_create_alert_hex_color()}
									placeholder="#0F766E"
									bind:value={alert.hex_color}
								/>
								<CwInput
									label={m.reports_create_alert_user_label()}
									placeholder={m.reports_create_alert_user_placeholder()}
									bind:value={alert.user_id}
								/>
							</div>

							<CwExpandPanel title={m.reports_create_advanced_alert_metadata()}>
								<div class="meta-grid">
									<CwInput
										label={m.reports_created_at()}
										placeholder={ISO_TIMESTAMP_PLACEHOLDER}
										bind:value={alert.created_at}
									/>
									<CwInput
										label={m.reports_create_field_id()}
										type="numeric"
										placeholder={NUMBER_PLACEHOLDER}
										bind:value={alert.id}
									/>
									<CwInput
										label={m.reports_create_field_report_id()}
										placeholder={UUID_PLACEHOLDER}
										bind:value={alert.report_id}
									/>
								</div>
							</CwExpandPanel>
						</div>
					{/each}
				</div>
			</CwCard>

			<CwCard
				title={m.reports_create_recipients_title()}
				subtitle={m.reports_create_recipients_subtitle()}
				elevated
			>
				<div class="card-stack">
					<div class="section-toolbar">
						<p class="section-copy">{m.reports_create_recipients_copy()}</p>
						<CwButton type="button" variant="secondary" onclick={addRecipient}
							>{m.reports_create_add_recipient()}</CwButton
						>
					</div>

					{#if fields.report_recipients.length === 0}
						<div class="empty-panel">{m.reports_create_empty_recipients()}</div>
					{/if}

					{#each fields.report_recipients as recipient, index (recipient.key)}
						<div class="entry-card">
							<div class="entry-card__header">
								<div>
									<h3>{m.reports_create_recipient_heading({ index: String(index + 1) })}</h3>
									<p>{m.reports_create_recipient_copy()}</p>
								</div>
								<CwButton
									type="button"
									variant="danger"
									size="sm"
									onclick={() => removeRecipient(recipient.key)}
								>
									{m.action_remove()}
								</CwButton>
							</div>

							<div class="field-grid field-grid--three">
								<CwDropdown
									label={m.reports_create_communication_method()}
									options={communicationMethodOptions}
									bind:value={recipient.communication_method}
								/>
								<CwInput
									label={m.reports_create_email_label()}
									type="email"
									placeholder={m.reports_create_email_placeholder()}
									bind:value={recipient.email}
								/>
								<CwInput
									label={m.common_name()}
									placeholder={m.reports_create_recipient_name_placeholder()}
									bind:value={recipient.name}
								/>
							</div>

							<!-- <div class="field-grid field-grid--two">
								<CwInput
									label={m.reports_create_recipient_user_label()}
									placeholder={m.reports_create_recipient_user_placeholder()}
									bind:value={recipient.user_id}
								/>
								<div class="context-panel context-panel--compact">
									<p class="eyebrow">{m.reports_create_resolved_method()}</p>
									<strong>
										{communicationMethodOptions.find(
											(option) => option.value === recipient.communication_method
										)?.label ?? recipient.communication_method}
									</strong>
									<p>{recipient.email || recipient.user_id || m.reports_create_no_destination()}</p>
								</div>
							</div> -->

							<!-- <CwExpandPanel title={m.reports_create_advanced_recipient_metadata()}>
								<div class="meta-grid">
									<CwInput
										label={m.reports_created_at()}
										placeholder={ISO_TIMESTAMP_PLACEHOLDER}
										bind:value={recipient.created_at}
									/>
									<CwInput
										label={m.reports_create_field_id()}
										type="numeric"
										placeholder={NUMBER_PLACEHOLDER}
										bind:value={recipient.id}
									/>
									<CwInput
										label={m.reports_create_field_report_id()}
										placeholder={UUID_PLACEHOLDER}
										bind:value={recipient.report_id}
									/>
								</div>
							</CwExpandPanel> -->
						</div>
					{/each}
				</div>
			</CwCard>

			<CwCard elevated>
				<div class="card-stack">
					<!-- <div class="preview-summary">
						<div class="preview-summary__copy">
							<p class="eyebrow">{m.reports_create_preview_target()}</p>
							<strong>{selectedDevice?.name ?? m.reports_create_preview_manual_target()}</strong>
							<p>{requestPayload.dev_eui || m.reports_create_preview_missing_dev_eui()}</p>
						</div>

						<div class="preview-summary__status" data-valid={canSubmit}>
							<span>
								{canSubmit ? m.reports_create_preview_valid() : m.reports_create_preview_invalid()}
							</span>
							<strong
								>{canSubmit
									? m.reports_create_preview_ready()
									: getIssueCountText(validationIssues.length)}</strong
							>
						</div>
					</div>

					<pre class="payload-preview">{requestPayloadPretty}</pre> -->

					<div class="form-actions">
						<CwButton type="button" variant="secondary" onclick={() => goto(resolve('/reports'))}>
							{m.action_cancel()}
						</CwButton>
						<CwButton type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
							{m.reports_create_submit()}
						</CwButton>
					</div>
				</div>
			</CwCard>
		</form>
	</div>
</div>

<style>
	.create-report-page {
		width: 100%;
		--report-surface: color-mix(in srgb, var(--cw-bg-surface, #0f172a) 94%, transparent);
		--report-surface-soft: color-mix(
			in srgb,
			var(--cw-bg-subtle, var(--cw-bg-surface, #0f172a)) 88%,
			var(--cw-primary-500, #0f766e) 12%
		);
		--report-panel: color-mix(
			in srgb,
			var(--cw-bg-surface-elevated, var(--cw-bg-surface, #0f172a)) 92%,
			var(--cw-bg-muted, #e2e8f0) 8%
		);
		--report-panel-strong: color-mix(
			in srgb,
			var(--cw-bg-surface-elevated, var(--cw-bg-surface, #0f172a)) 88%,
			var(--cw-primary-500, #0f766e) 12%
		);
		--report-border: color-mix(in srgb, var(--cw-border-default, #334155) 74%, transparent);
		--report-border-strong: color-mix(
			in srgb,
			var(--cw-border-default, #334155) 78%,
			var(--cw-primary-500, #0f766e) 22%
		);
		--report-copy: var(--cw-text-primary, #f8fafc);
		--report-muted: var(--cw-text-secondary, #94a3b8);
		--report-danger-bg: color-mix(
			in srgb,
			var(--cw-danger-500, #ef4444) 18%,
			var(--cw-bg-surface, #0f172a)
		);
		--report-danger-border: color-mix(
			in srgb,
			var(--cw-danger-500, #ef4444) 44%,
			var(--cw-border-default, #334155)
		);
		--report-danger-text: color-mix(
			in srgb,
			var(--cw-danger-500, #ef4444) 72%,
			var(--cw-text-primary, #f8fafc)
		);
	}

	.page-shell {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin: 0 auto;
		max-width: 72rem;
		padding-bottom: 2rem;
	}

	.report-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.card-stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.field-grid,
	.meta-grid,
	.switch-grid {
		display: grid;
		gap: 1rem;
	}

	.field-grid--two,
	.meta-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.field-grid--three,
	.switch-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.empty-panel,
	.validation-panel {
		background: var(--report-surface);
		border: 1px solid var(--report-border);
		border-radius: 1rem;
		padding: 1rem;
	}

	.empty-panel,
	.hint,
	.section-copy,
	.entry-card__header p,
	.validation-panel__copy {
		color: var(--report-muted);
		margin: 0;
	}

	.section-toolbar,
	.entry-card__header,
	.form-actions {
		align-items: flex-start;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
	}

	.section-copy {
		max-width: 48rem;
	}

	.entry-card {
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--report-panel-strong) 82%, transparent),
				var(--report-panel)
			),
			var(--report-panel);
		border: 1px solid var(--report-border);
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.entry-card__header h3,
	.validation-panel__title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}

	.form-error {
		background: var(--report-danger-bg);
		border: 1px solid var(--report-danger-border);
		border-radius: 0.9rem;
		color: var(--report-danger-text);
		margin: 0;
		padding: 0.9rem 1rem;
	}

	.validation-panel {
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--cw-warning-500, #f59e0b) 9%, transparent),
				transparent 50%
			),
			var(--report-surface);
		border-color: color-mix(in srgb, var(--cw-warning-500, #f59e0b) 32%, var(--report-border));
		display: grid;
		gap: 0.75rem;
	}

	.validation-list {
		display: grid;
		gap: 0.45rem;
		margin: 0;
		padding-left: 1.25rem;
	}

	.form-actions {
		justify-content: flex-end;
	}

	@media (max-width: 960px) {
		.field-grid--three,
		.switch-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.field-grid--two,
		.field-grid--three,
		.meta-grid,
		.switch-grid {
			grid-template-columns: 1fr;
		}

		.section-toolbar,
		.entry-card__header,
		.form-actions {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
