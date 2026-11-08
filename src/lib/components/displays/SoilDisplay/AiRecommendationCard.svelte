<script lang="ts">
	import type {
		AiFindingDisplayDto,
		AiFindingTextDto,
		AiRecommendationDto
	} from '$lib/api/api.dtos';
	import { formatDateTime, getUiLocale } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/Icon.svelte';
	import LIGHTBULB_ICON from '$lib/images/icons/lightbulb.svg';
	import PRINT_ICON from '$lib/images/icons/print.svg';
	import { printElement } from '$lib/utils/print-element';
	import { CwButton, CwCard, CwChip, CwExpandPanel, type CwTone } from '@cropwatchdevelopment/cwui';

	interface Props {
		/** The sensor's newest daily report from the CropWatch AI worker. */
		report: AiRecommendationDto;
	}

	let { report }: Props = $props();

	let root: HTMLElement | undefined = $state();
	let printing = $state(false);

	type Row = {
		severity: number;
		action: string;
		display: AiFindingDisplayDto;
		text: AiFindingTextDto;
		/** "Low " / "High " before the value when it is the low or high end; empty otherwise. */
		valuePrefix: string;
		statusLabel: string;
	};

	const STATUS_LABELS: Record<string, () => string> = {
		below: m.devices_ai_report_state_below,
		above: m.devices_ai_report_state_above,
		low_end_below: m.devices_ai_report_state_low_end_below,
		peak_above: m.devices_ai_report_state_peak_above,
		invalid: m.devices_ai_report_state_invalid
	};

	let english = $derived(getUiLocale() === 'en');
	let listSeparator = $derived(english ? ', ' : '、');
	let titleColon = $derived(english ? ':' : '：');
	let averagePrefix = $derived(`${english ? '; ' : '、'}${m.devices_ai_report_average()} `);
	let headline = $derived(english ? report.headline_en : report.headline_ja);
	// The model's text, one finding per line (older reports are a single paragraph).
	let points = $derived(
		(english ? report.body_en : report.body_ja)
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
	);
	// The table and the action list need every finding's display data; reports written
	// before that format fall back to the model's text.
	let rows = $derived.by((): Row[] => {
		const findings = report.findings ?? [];
		if (findings.length === 0 || !findings.every((f) => f.display)) return [];
		return findings.map((f) => {
			const display = f.display as AiFindingDisplayDto;
			const text = english ? display.en : display.ja;
			const kindLabel =
				display.kind === 'low'
					? m.devices_ai_report_low()
					: display.kind === 'high'
						? m.devices_ai_report_high()
						: '';
			const status = (STATUS_LABELS[display.status] ?? STATUS_LABELS.below)();
			return {
				severity: f.severity,
				action: f.action,
				display,
				text,
				valuePrefix: kindLabel ? `${kindLabel} ` : '',
				statusLabel: text.days_off ? `${status} (${text.days_off})` : status
			};
		});
	});
	// One bullet per action: two sensor faults share "check the sensor"; a finding that
	// another action covers shows how that action helps it.
	let actionItems = $derived.by(() => {
		const seen: string[] = [];
		const list: { title: string; text: string }[] = [];
		for (const row of rows) {
			const key = row.text.note ? `note:${row.display.en.what}` : row.action;
			if (seen.includes(key)) continue;
			seen.push(key);
			list.push({ title: row.text.action_title, text: row.text.note ?? row.text.action });
		}
		return list;
	});
	let onTarget = $derived(
		(report.details ?? [])
			.filter((d) => d.severity === 0 || d.severity === 1)
			.map((d) => (english ? d.what_en : d.what_ja))
			.filter((name): name is string => Boolean(name))
	);
	// period_start is the sensor's local calendar day: show that day whatever the viewer's zone.
	let periodLabel = $derived(
		formatDateTime(
			`${report.period_start}T00:00:00Z`,
			{ month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' },
			report.period_start
		)
	);
	let status = $derived.by((): { tone: CwTone; label: string } => {
		if (report.status === 'good') {
			return { tone: 'success', label: m.devices_ai_report_status_good() };
		}
		if (report.status === 'insufficient_data') {
			return { tone: 'secondary', label: m.devices_ai_report_status_insufficient() };
		}
		return report.max_severity >= 3
			? { tone: 'danger', label: m.devices_ai_report_status_critical() }
			: { tone: 'warning', label: m.devices_ai_report_status_attention() };
	});

	/** Prints just this card, with both panels open and without the print button. */
	async function printCard() {
		if (!root || printing) return;
		printing = true;
		try {
			await printElement(root, {
				title: `${m.devices_ai_report_title()} ${periodLabel}`,
				prepare: (copy) => {
					copy
						.querySelectorAll('.cw-expand')
						.forEach((panel) => panel.classList.add('cw-expand--open'));
					copy.querySelectorAll('[inert]').forEach((el) => el.removeAttribute('inert'));
					copy
						.querySelectorAll('.cw-expand__chevron, .ai-report__print')
						.forEach((el) => el.remove());
				}
			});
		} finally {
			printing = false;
		}
	}
</script>

<div class="ai-report" bind:this={root}>
	<CwCard elevated>
		{#snippet header()}
			<div class="ai-report__titles">
				<div class="ai-report__title-row">
					<Icon src={LIGHTBULB_ICON} class="ai-report__bulb" />
					<h3 class="ai-report__title">{m.devices_ai_report_title()}</h3>
				</div>
				<p class="ai-report__subtitle">{m.devices_ai_report_subtitle({ date: periodLabel })}</p>
			</div>
		{/snippet}

		{#snippet actions()}
			<CwChip label={status.label} tone={status.tone} size="sm" />
			<CwButton
				id="ai-report-print-button"
				class="ai-report__print"
				type="button"
				variant="secondary"
				size="sm"
				loading={printing}
				onclick={printCard}
			>
				<Icon src={PRINT_ICON} class="h-4 w-4" />
				{m.devices_ai_report_print()}
			</CwButton>
		{/snippet}

		<div class="ai-report__content">
			<p class="ai-report__headline">{headline}</p>

			{#if rows.length > 0}
				<table class="ai-report__table">
					<thead>
						<tr>
							<th scope="col">{m.devices_ai_report_col_measurement()}</th>
							<th scope="col">{m.devices_ai_report_col_recorded()}</th>
							<th scope="col">{m.devices_ai_report_col_target()}</th>
							<th scope="col">{m.devices_ai_report_col_status()}</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row, index (index)}
							<tr>
								<th scope="row" class="ai-report__what">{row.text.what}</th>
								<td data-label={m.devices_ai_report_col_recorded()}>
									<span class="ai-report__recorded">
										{#if row.text.value}
											{row.valuePrefix}<strong>{row.text.value}</strong
											>{#if row.text.average}{averagePrefix}<strong>{row.text.average}</strong>{/if}
										{:else}
											—
										{/if}
									</span>
								</td>
								<td data-label={m.devices_ai_report_col_target()}>{row.text.target ?? '—'}</td>
								<td data-label={m.devices_ai_report_col_status()}>
									<span
										class="ai-report__status"
										class:ai-report__status--critical={row.severity >= 3}
										class:ai-report__status--attention={row.severity < 3}
									>
										{row.statusLabel}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<section class="ai-report__section">
					<h4 class="ai-report__subheading">{m.devices_ai_report_actions()}</h4>
					<ul class="ai-report__actions">
						{#each actionItems as action, index (index)}
							<li><strong>{action.title}{titleColon}</strong> {action.text}</li>
						{/each}
					</ul>
				</section>

				{#if onTarget.length > 0}
					<p class="ai-report__on-target">
						<strong>{m.devices_ai_report_on_target({ names: onTarget.join(listSeparator) })}</strong
						>
					</p>
				{/if}

				{#if points.length > 0}
					<CwExpandPanel title={m.devices_ai_report_ai_text()}>
						<div class="ai-report__ai-text">
							{#each points as point, index (index)}
								<p>{point}</p>
							{/each}
						</div>
					</CwExpandPanel>
				{/if}
			{:else}
				<ul class="ai-report__points">
					{#each points as point, index (index)}
						<li class="ai-report__point">{point}</li>
					{/each}
				</ul>
			{/if}

			{#if report.details.length > 0}
				<CwExpandPanel title={m.devices_ai_report_details()}>
					<ul class="ai-report__details">
						{#each report.details as detail (`${detail.metric}:${detail.period}`)}
							<li>{english ? detail.en : detail.ja}</li>
						{/each}
					</ul>
				</CwExpandPanel>
			{/if}

			<p class="ai-report__note">{m.devices_ai_report_note()}</p>
		</div>
	</CwCard>
</div>

<style>
	.ai-report__titles {
		flex: 1;
		min-width: 0;
	}

	.ai-report__title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ai-report__title-row :global(.ai-report__bulb) {
		inline-size: 1.375rem;
		block-size: 1.375rem;
		color: var(--cw-warning-500, #f79009);
	}

	.ai-report__title {
		margin: 0;
		font-size: var(--cw-text-lg, 1.125rem);
		font-weight: var(--cw-font-semibold, 600);
		line-height: var(--cw-leading-tight, 1.25);
		color: var(--cw-text-primary, #101828);
		overflow-wrap: anywhere;
	}

	.ai-report__subtitle {
		margin: var(--cw-space-1, 0.25rem) 0 0;
		font-size: var(--cw-text-sm, 0.875rem);
		color: var(--cw-text-muted, #475467);
	}

	.ai-report__content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		color: var(--cw-text-primary, #101828);
	}

	.ai-report__headline {
		margin: 0;
		font-size: var(--cw-text-lg, 1.125rem);
		font-weight: 600;
		line-height: 1.4;
	}

	.ai-report__table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--cw-text-sm, 0.875rem);
		line-height: 1.5;
	}

	.ai-report__table th,
	.ai-report__table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--cw-border-muted, #e4e7ec);
		text-align: left;
		vertical-align: top;
	}

	.ai-report__table thead th {
		font-size: var(--cw-text-xs, 0.75rem);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--cw-text-muted, #475467);
		background: var(--cw-bg-subtle, #f8fafc);
	}

	.ai-report__what {
		font-weight: 600;
	}

	.ai-report__status {
		font-weight: 600;
	}

	.ai-report__status--critical {
		color: var(--cw-danger-500, #d92d20);
	}

	.ai-report__status--attention {
		color: var(--cw-warning-500, #b54708);
	}

	.ai-report__section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ai-report__subheading {
		margin: 0;
		font-size: var(--cw-text-base, 1rem);
		font-weight: 600;
	}

	.ai-report__actions {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		line-height: 1.6;
	}

	.ai-report__on-target {
		margin: 0;
	}

	.ai-report__ai-text p {
		margin: 0 0 0.5rem;
		line-height: 1.6;
	}

	.ai-report__points {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ai-report__point {
		padding: 0.625rem 0.875rem;
		border-left: 3px solid var(--cw-primary-500, #2563eb);
		border-radius: 0 0.5rem 0.5rem 0;
		background: var(--cw-bg-subtle, #f8fafc);
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.ai-report__details {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: var(--cw-text-sm, 0.875rem);
		line-height: 1.5;
	}

	.ai-report__note {
		margin: 0;
		font-size: var(--cw-text-xs, 0.75rem);
		color: var(--cw-text-muted, #475467);
	}

	/* Phones: each finding becomes a small block, the column name beside each value. */
	@media (max-width: 640px) {
		.ai-report__table thead {
			display: none;
		}

		.ai-report__table tr {
			display: block;
			padding: 0.5rem 0;
			border-bottom: 1px solid var(--cw-border-muted, #e4e7ec);
		}

		.ai-report__table th,
		.ai-report__table td {
			display: flex;
			gap: 0.75rem;
			justify-content: space-between;
			padding: 0.25rem 0;
			border-bottom: none;
		}

		.ai-report__table td::before {
			content: attr(data-label);
			flex-shrink: 0;
			color: var(--cw-text-muted, #475467);
		}

		.ai-report__table td {
			text-align: right;
		}
	}
</style>
