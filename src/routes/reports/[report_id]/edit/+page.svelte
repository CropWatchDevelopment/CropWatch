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
	import { type CwAlertPointCondition, type CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
	import type {
		CreateReportAlertPointRequest,
		CreateReportDataProcessingScheduleRequest,
		CreateReportRecipientRequest,
		CreateReportRequest,
		CreateReportUserScheduleRequest,
		DeviceDto,
		ReportDto
	} from '$lib/api/api.dtos';
	import type { PageProps } from './$types';
	import ReportCadenceSection from './ReportCadenceSection.svelte';
	import ReportProcessingSchedulesSection from './ReportProcessingSchedulesSection.svelte';
	import ReportRecipientsSection from './ReportRecipientsSection.svelte';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import CANCEL_ICON from '$lib/images/icons/no.svg';
	import type {
		DataProcessingScheduleDraft,
		RecipientDraft,
		ReportDraft,
		ScheduleDraft,
		SelectOption
	} from './report-form.types';
	import { createReportAlertPointsEditorText } from './alert-points-editor-text';
	import {
		DEFAULT_REPORT_DATA_PULL_INTERVAL,
		buildReportDataPullIntervalOptions,
		normalizeReportDataPullInterval,
		parseReportDataPullInterval
	} from './data-pull-interval';

	type ReportForm = {
		error?: string;
		message?: string;
		payload?: string;
		report_id?: string;
		success?: boolean;
	} | null;

	type CurrentUser = {
		email: string;
		id: string;
		name: string;
	} | null;

	type DeviceListEntry = {
		dev_eui: string;
		name?: string | null;
	};

	const DEFAULT_ALERT_COLOR = '';
	const DEFAULT_ALERT_DATA_POINT_KEY = 'temperature_c';
	const REPORT_CREATED_SUCCESS_MESSAGE = 'Report created successfully.';
	const REPORT_UPDATED_SUCCESS_MESSAGE = 'Report updated successfully.';

	const toast = useCwToast();
	const app = getAppContext();

	let { data, form }: PageProps = $props();
	const report = (() => data.report ?? null)();
	const isEditing = report !== null;
	const authToken = (() => data.authToken ?? null)();
	const serverDevices = (() => data.devices ?? [])();
	let actionForm = $derived((form ?? null) as ReportForm);
	let currentUser = $derived((data.currentUser ?? null) as CurrentUser);
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

	function preventImplicitFormSubmission(node: HTMLFormElement) {
		function normalizeButtonTypes() {
			for (const button of node.querySelectorAll<HTMLButtonElement>('button:not([type])')) {
				button.type = 'button';
			}
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key !== 'Enter' || event.defaultPrevented) return;

			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			if (target instanceof HTMLButtonElement) return;
			if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
			if (target instanceof HTMLInputElement) {
				if (['button', 'checkbox', 'file', 'radio', 'reset', 'submit'].includes(target.type)) {
					return;
				}
			}

			event.preventDefault();
		}

		normalizeButtonTypes();

		const observer = new MutationObserver(() => {
			normalizeButtonTypes();
		});

		observer.observe(node, { childList: true, subtree: true });
		node.addEventListener('keydown', handleKeydown);

		return () => {
			observer.disconnect();
			node.removeEventListener('keydown', handleKeydown);
		};
	}

	function createEmptyAlertPointsValue(): CwAlertPointsValue {
		return {
			unit: 'C',
			center: '0',
			points: []
		};
	}

	function mapAlertConditionToOperator(condition: CwAlertPointCondition): string {
		switch (condition) {
			case 'greaterThan':
				return '>';
			case 'greaterThanOrEqual':
				return '>=';
			case 'lessThan':
				return '<';
			case 'lessThanOrEqual':
				return '<=';
			case 'range':
				return 'range';
			case 'equals':
			default:
				return '=';
		}
	}

	function mapOperatorToAlertCondition(operator: string | null | undefined): CwAlertPointCondition {
		switch (operator) {
			case '>':
				return 'greaterThan';
			case '>=':
				return 'greaterThanOrEqual';
			case '<':
				return 'lessThan';
			case '<=':
				return 'lessThanOrEqual';
			case 'range':
				return 'range';
			case '=':
			default:
				return 'equals';
		}
	}

	function buildReportAlertPoints(
		alertPoints: CwAlertPointsValue,
		defaults: {
			reportId?: string;
			userId?: string;
		}
	): CreateReportAlertPointRequest[] {
		return alertPoints.points.map((point) => {
			const alertPayload: CreateReportAlertPointRequest = {
				data_point_key: DEFAULT_ALERT_DATA_POINT_KEY,
				name: point.name.trim()
			};

			if (point.id !== undefined && point.id !== null && point.id !== '') {
				const parsedId = Number(point.id);
				if (!isNaN(parsedId)) {
					alertPayload.id = parsedId;
				}
			}

			const alertHexColor = cleanOptional(point.color)?.toUpperCase();
			const alertMax = parseOptionalNumber(point.max);
			const alertMin = parseOptionalNumber(point.min);
			const alertOperator = cleanOptional(mapAlertConditionToOperator(point.condition));
			const alertValue = parseOptionalNumber(point.value);

			if (alertHexColor) alertPayload.hex_color = alertHexColor;
			if (alertMax !== undefined) alertPayload.max = alertMax;
			if (alertMin !== undefined) alertPayload.min = alertMin;
			if (alertOperator) alertPayload.operator = alertOperator;
			if (defaults.reportId) alertPayload.report_id = defaults.reportId;
			if (defaults.userId) alertPayload.user_id = defaults.userId;
			if (alertValue !== undefined) alertPayload.value = alertValue;

			return alertPayload;
		});
	}

	function buildAlertValidationIssues(alertPoints: CwAlertPointsValue): string[] {
		const issues: string[] = [];

		alertPoints.points.forEach((point, index) => {
			const rowIndex = String(index + 1);

			if (!point.name.trim()) {
				issues.push(m.reports_create_validation_alert_name({ index: rowIndex }));
			}

			if (point.condition === 'range') {
				const min = parseOptionalNumber(point.min);
				const max = parseOptionalNumber(point.max);

				if (min === undefined || max === undefined) {
					issues.push(m.reports_create_validation_alert_range_required({ index: rowIndex }));
				} else if (min > max) {
					issues.push(m.reports_create_validation_alert_range_order({ index: rowIndex }));
				}
			} else if (parseOptionalNumber(point.value) === undefined) {
				issues.push(m.reports_create_validation_alert_value({ index: rowIndex }));
			}

			const hexColor = cleanOptional(point.color);
			if (hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
				issues.push(m.reports_create_validation_alert_hex({ index: rowIndex }));
			}
		});

		return issues;
	}

	function createEmptySchedule(rootUserId = currentUser?.id ?? ''): ScheduleDraft {
		return {
			created_at: '',
			dev_eui: '',
			end_of_day: false,
			end_of_week: true,
			id: '',
			is_active: true,
			key: nextRowKey('schedule'),
			report_id: report?.report_id ?? '',
			report_user_schedule_id: '',
			user_id: rootUserId
		};
	}

	function createEmptyDataProcessingSchedule(): DataProcessingScheduleDraft {
		return {
			crosses_midnight: false,
			day_of_week: '1',
			end_time: '17:00',
			id: '',
			is_enabled: true,
			key: nextRowKey('dps'),
			report_id: report?.report_id ?? '',
			rule_type: 'include',
			start_time: '09:00',
			timezone: 'JST'
		};
	}

	function createEmptyRecipient(rootUserId = currentUser?.id ?? ''): RecipientDraft {
		return {
			communication_method: '1',
			created_at: '',
			email: currentUser?.email ?? '',
			id: '',
			key: nextRowKey('recipient'),
			name: currentUser?.name ?? '',
			report_id: report?.report_id ?? '',
			user_id: rootUserId
		};
	}

	function buildDefaultDraft(): ReportDraft {
		return {
			created_at: '',
			data_pull_interval: DEFAULT_REPORT_DATA_PULL_INTERVAL,
			dev_eui: normalizeDevEui(data.devEui ?? ''),
			id: '',
			name: '',
			report_id: '',
			report_data_processing_schedules: [],
			report_recipients: [createEmptyRecipient()],
			report_user_schedule: [createEmptySchedule()],
			user_id: currentUser?.id ?? ''
		};
	}

	function buildDraftFromReport(source: ReportDto): ReportDraft {
		const normalizedReportDevEui = normalizeDevEui(source.dev_eui ?? '');
		const rootUserId = cleanOptional(source.user_id ?? '') ?? currentUser?.id ?? '';
		const reportId = source.report_id ?? '';

		const schedules =
			source.report_user_schedule?.map((schedule) => {
				const scheduleDevEui = normalizeDevEui(schedule.dev_eui ?? '');

				return {
					created_at: schedule.created_at ?? '',
					dev_eui: scheduleDevEui === normalizedReportDevEui ? '' : scheduleDevEui,
					end_of_day: schedule.end_of_day ?? false,
					end_of_week: schedule.end_of_week ?? false,
					id: schedule.id != null ? String(schedule.id) : '',
					is_active: schedule.is_active ?? true,
					key: nextRowKey('schedule'),
					report_id: cleanOptional(schedule.report_id ?? '') ?? reportId,
					report_user_schedule_id:
						schedule.report_user_schedule_id != null
							? String(schedule.report_user_schedule_id)
							: '',
					user_id: cleanOptional(schedule.user_id ?? '') ?? rootUserId
				};
			}) ?? [];

		const recipients =
			source.report_recipients?.map((recipient) => ({
				communication_method:
					recipient.communication_method != null ? String(recipient.communication_method) : '1',
				created_at: recipient.created_at ?? '',
				email: recipient.email ?? '',
				id: recipient.id != null ? String(recipient.id) : '',
				key: nextRowKey('recipient'),
				name: recipient.name ?? '',
				report_id: cleanOptional(recipient.report_id ?? '') ?? reportId,
				user_id: cleanOptional(recipient.user_id ?? '') ?? rootUserId
			})) ?? [];

		const dataProcessingSchedules =
			source.report_data_processing_schedules?.map((s) => ({
				crosses_midnight: s.crosses_midnight ?? false,
				day_of_week: s.day_of_week != null ? String(s.day_of_week) : '1',
				end_time: s.end_time ?? '17:00',
				id: s.id ?? '',
				is_enabled: s.is_enabled ?? true,
				key: nextRowKey('dps'),
				report_id: s.report_id ?? reportId,
				rule_type: s.rule_type ?? 'include',
				start_time: s.start_time ?? '09:00',
				timezone: s.timezone ?? 'UTC'
			})) ?? [];

		return {
			created_at: source.created_at ?? '',
			data_pull_interval: normalizeReportDataPullInterval(source.data_pull_interval),
			dev_eui: normalizedReportDevEui,
			id: source.id != null ? String(source.id) : '',
			name: source.name ?? '',
			report_id: reportId,
			report_data_processing_schedules: dataProcessingSchedules,
			report_recipients: recipients.length > 0 ? recipients : [createEmptyRecipient(rootUserId)],
			report_user_schedule: schedules.length > 0 ? schedules : [createEmptySchedule(rootUserId)],
			user_id: rootUserId
		};
	}

	function buildAlertPointsValueFromReport(source: ReportDto): CwAlertPointsValue {
		const baseValue = createEmptyAlertPointsValue();
		const points =
			source.report_alert_points?.map((point, index) => {
				const condition =
					typeof point.operator === 'string' && point.operator.trim().length > 0
						? mapOperatorToAlertCondition(point.operator)
						: point.min != null || point.max != null
							? 'range'
							: 'equals';
				const fallbackId = point.id != null ? String(point.id) : nextRowKey(`alert-${index + 1}`);

				return {
					color: cleanOptional(point.hex_color ?? '')?.toUpperCase() ?? DEFAULT_ALERT_COLOR,
					condition,
					id: fallbackId,
					max: point.max != null ? String(point.max) : '',
					min: point.min != null ? String(point.min) : '',
					name: point.name ?? '',
					value: point.value != null ? String(point.value) : ''
				};
			}) ?? [];

		return { ...baseValue, points };
	}

	function buildRequestPayload(
		draft: ReportDraft,
		rootDevEui: string,
		alertPoints: CwAlertPointsValue
	): CreateReportRequest {
		const createdAt = cleanOptional(draft.created_at);
		const id = parseOptionalInteger(draft.id);
		const reportId = cleanOptional(draft.report_id);
		const userId = cleanOptional(draft.user_id) ?? currentUser?.id ?? undefined;
		const devEui = normalizeDevEui(rootDevEui);
		const dataPullInterval = parseReportDataPullInterval(draft.data_pull_interval);

		const reportUserSchedule: CreateReportUserScheduleRequest[] = draft.report_user_schedule.map(
			(schedule) => {
				const schedulePayload: CreateReportUserScheduleRequest = {
					dev_eui: normalizeDevEui(schedule.dev_eui) || devEui,
					end_of_day: schedule.end_of_day,
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

		const reportAlertPoints = buildReportAlertPoints(alertPoints, { reportId, userId });

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

		const reportDataProcessingSchedules: CreateReportDataProcessingScheduleRequest[] =
			draft.report_data_processing_schedules
				.filter((s) => s.day_of_week && s.start_time && s.end_time)
				.map((s) => {
					const entry: CreateReportDataProcessingScheduleRequest = {
						day_of_week: parseInt(s.day_of_week, 10),
						start_time: s.start_time,
						end_time: s.end_time
					};
					if (s.crosses_midnight !== undefined) entry.crosses_midnight = s.crosses_midnight;
					if (s.id) entry.id = s.id;
					entry.is_enabled = s.is_enabled;
					if (s.report_id) entry.report_id = s.report_id;
					if (s.rule_type) entry.rule_type = s.rule_type;
					if (s.timezone) entry.timezone = s.timezone;
					return entry;
				});

		const payload: CreateReportRequest = {
			dev_eui: devEui,
			name: draft.name.trim(),
			report_alert_points: reportAlertPoints,
			report_data_processing_schedules: reportDataProcessingSchedules,
			report_recipients: reportRecipients,
			report_user_schedule: reportUserSchedule
		};

		if (createdAt) payload.created_at = createdAt;
		if (dataPullInterval !== undefined) payload.data_pull_interval = dataPullInterval;
		if (id !== undefined) payload.id = id;
		if (reportId) payload.report_id = reportId;
		if (userId) payload.user_id = userId;

		return payload;
	}

	function buildValidationIssues(
		draft: ReportDraft,
		rootDevEui: string,
		alertPoints: CwAlertPointsValue
	): string[] {
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

			if (schedule.is_active && !schedule.end_of_week && !schedule.end_of_day) {
				issues.push(m.reports_create_validation_schedule_cadence({ index: rowIndex }));
			}
		});

		issues.push(...buildAlertValidationIssues(alertPoints));

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

	function addDataProcessingSchedule() {
		fields.report_data_processing_schedules.push(createEmptyDataProcessingSchedule());
	}

	function removeDataProcessingSchedule(key: string) {
		const idx = fields.report_data_processing_schedules.findIndex((s) => s.key === key);
		if (idx >= 0) fields.report_data_processing_schedules.splice(idx, 1);
	}

	function addRecipient() {
		fields.report_recipients = [...fields.report_recipients, createEmptyRecipient(fields.user_id)];
	}

	function removeRecipient(key: string) {
		fields.report_recipients = fields.report_recipients.filter(
			(recipient) => recipient.key !== key
		);
	}

	let fields = $state<ReportDraft>(report ? buildDraftFromReport(report) : buildDefaultDraft());
	let alertPointsValue = $state<CwAlertPointsValue>(
		report ? buildAlertPointsValueFromReport(report) : createEmptyAlertPointsValue()
	);
	let fallbackDevices = $state<DeviceDto[]>([]);
	let loadingDevices = $state(false);
	const initialDevEui = (() => data.devEui ?? '')();
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
		buildRequestPayload(fields, normalizedSelectedDevEui, alertPointsValue)
	);
	let requestPayloadCompact = $derived.by(() => JSON.stringify(requestPayload));
	let validationIssues = $derived.by(() =>
		buildValidationIssues(fields, normalizedSelectedDevEui, alertPointsValue)
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
