<script lang="ts">
	import { resolve } from '$app/paths';
	import { CwButton, useCwToast } from '@cropwatchdevelopment/cwui';
	import { apiErrorMessage } from '$lib/api/api-error';
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppNotice, AppPage } from '$lib/components/layout';
	import { formatRelative, getIntlLocale } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { getServices } from '$lib/services/context';
	import { onAppForeground } from '$lib/utils/onAppForeground';
	import { reactiveNow } from '$lib/utils/reactive-now.svelte';
	import type { PageProps } from './$types';
	import ActivityCard from './ActivityCard.svelte';
	import AttentionCard from './AttentionCard.svelte';
	import BreakdownCard from './BreakdownCard.svelte';
	import HealthCard from './HealthCard.svelte';
	import HealthHero from './HealthHero.svelte';
	import KpiCards from './KpiCards.svelte';
	import LiveStatus from './LiveStatus.svelte';
	import LocationsCard from './LocationsCard.svelte';
	import NotesCard from './NotesCard.svelte';
	import OverviewIcon from './OverviewIcon.svelte';
	import RangeSwitch from './RangeSwitch.svelte';
	import ReportingChart from './ReportingChart.svelte';
	import ReportsCard from './ReportsCard.svelte';
	import { attentionRows, nextRefreshAt, onlineShare, type HealthState } from './overview';
	import { OverviewRanges } from './overview-ranges.svelte';

	let { data }: PageProps = $props();

	const app = getAppContext();
	const services = getServices();
	const toast = useCwToast();
	const locale = getIntlLocale();

	/** Shown as "Live" while the data on screen is younger than this. */
	const FRESH_MS = 15 * 60 * 1000;
	/** Coming back to the tab refetches when the data is older than this. */
	const FOREGROUND_REFRESH_MS = 60 * 1000;
	/** Background refreshes are checked on this beat while the tab is visible. */
	const REFRESH_TICK_MS = 60 * 1000;

	// Seeded once from the server; see OverviewRanges for the caching rules.
	const ranges = new OverviewRanges({
		fetcher: (range) => services.overview.getOverview(range),
		onError: (error) =>
			toast.add({ tone: 'danger', message: apiErrorMessage(error, m.overview_load_failed()) }),
		initial: (() => data.initialOverview)()
	});

	const overview = $derived(ranges.current);
	const now = $derived(reactiveNow.value);
	// A personal org is named after its owner: only a company name is worth showing.
	const orgName = $derived(
		app.orgContext?.org?.type === 'company' ? app.orgContext.org.name : null
	);

	// When the beat started, so the live line can count down to a check.
	let tickOrigin = $state(Date.now());

	// Every 10 minutes while the tab is visible, and on coming back to it.
	// Nothing polls while the tab is hidden.
	$effect(() => {
		tickOrigin = Date.now();
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') ranges.refreshIfStale();
		}, REFRESH_TICK_MS);
		const stopForeground = onAppForeground(() => ranges.refreshIfStale(FOREGROUND_REFRESH_MS));
		return () => {
			clearInterval(timer);
			stopForeground();
		};
	});

	/** The singular or plural message for n. */
	const byCount = (n: number, one: () => string, other: (params: { count: number }) => string) =>
		n === 1 ? one() : other({ count: n });

	const rows = $derived(overview ? attentionRows(overview) : []);

	const health = $derived.by(() => {
		if (!overview) return null;
		const devices = overview.devices;
		const share = onlineShare(overview);
		const items = rows.length;
		const state: HealthState = devices.total === 0 ? 'empty' : items === 0 ? 'ok' : 'attention';
		const gatewaysOffline = overview.gateways.total - overview.gateways.online;
		const title =
			state === 'empty'
				? m.overview_health_empty_title()
				: state === 'ok'
					? m.overview_health_ok_title()
					: share >= 0.9
						? byCount(
								items,
								m.overview_health_mostly_title_one,
								m.overview_health_mostly_title_other
							)
						: byCount(
								items,
								m.overview_health_attention_title_one,
								m.overview_health_attention_title_other
							);
		const lastData = formatRelative(devices.lastDataAt, now, locale);
		const parts =
			state === 'empty'
				? [m.overview_health_empty_body()]
				: [
						devices.offline === 0
							? m.overview_health_all_online()
							: byCount(
									devices.offline,
									m.overview_health_offline_one,
									m.overview_health_offline_other
								),
						overview.alerts.active === 0
							? m.overview_health_no_alerts()
							: byCount(
									overview.alerts.active,
									m.overview_health_alerts_one,
									m.overview_health_alerts_other
								),
						...(overview.gateways.total === 0
							? []
							: [
									gatewaysOffline === 0
										? m.overview_health_gateways_ok()
										: byCount(
												gatewaysOffline,
												m.overview_health_gateways_offline_one,
												m.overview_health_gateways_offline_other
											)
								]),
						lastData ? m.overview_health_last_data({ when: lastData }) : m.overview_health_no_data()
					];
		return { state, title, parts, percent: Math.round(share * 100) };
	});

	const fresh = $derived(overview !== null && now - Date.parse(overview.generatedAt) < FRESH_MS);
	const nextUpdateAt = (at: number) => {
		const due = ranges.refreshDueAt;
		return due === null ? null : nextRefreshAt(due, tickOrigin, at, REFRESH_TICK_MS);
	};
</script>

<svelte:head>
	<title>{m.overview_page_title()}</title>
</svelte:head>

<AppPage>
	<div class="ov" class:ov--loading={ranges.pending !== null} aria-busy={ranges.pending !== null}>
		<header class="ov-header">
			<div class="ov-header__titles">
				{#if orgName}
					<div class="ov-header__eyebrow">{orgName}</div>
				{/if}
				<h1 class="ov-header__title">{m.overview_page_title()}</h1>
				{#if overview}
					<LiveStatus
						class="ov-wide-only"
						generatedAt={overview.generatedAt}
						{fresh}
						{nextUpdateAt}
						updating={ranges.refreshing}
					/>
				{/if}
			</div>
			<!-- Phones get the range switch under the health card; the dashboard
			     link stays up here (and at the bottom) at every width. -->
			<div class="ov-header__actions">
				{#if overview}
					<RangeSwitch
						class="ov-wide-only"
						value={ranges.range}
						onselect={(next) => ranges.select(next)}
					/>
				{/if}
				<a class="ov-button" href={resolve('/')}>
					{m.overview_open_dashboard()}<OverviewIcon name="arrow" size={16} />
				</a>
			</div>
		</header>

		{#if !overview || !health}
			{#if ranges.failed}
				<AppNotice tone="danger">
					<p>{m.overview_load_failed()}</p>
					<CwButton
						variant="secondary"
						size="sm"
						loading={ranges.pending !== null}
						onclick={() => ranges.load(ranges.range)}
					>
						{m.action_try_again()}
					</CwButton>
				</AppNotice>
			{/if}
		{:else}
			<HealthCard
				class="ov-wide-only"
				state={health.state}
				title={health.title}
				parts={health.parts}
			/>
			<HealthHero
				class="ov-narrow-only"
				state={health.state}
				title={health.title}
				percent={health.percent}
				online={overview.devices.online}
				offline={overview.devices.offline}
				activeAlerts={overview.alerts.active}
			>
				{#snippet live()}
					<LiveStatus
						compact
						generatedAt={overview.generatedAt}
						{fresh}
						{nextUpdateAt}
						updating={ranges.refreshing}
					/>
				{/snippet}
			</HealthHero>
			<RangeSwitch
				class="ov-narrow-only"
				full
				value={ranges.range}
				onselect={(next) => ranges.select(next)}
			/>

			<div class="ov-range-dependent">
				<KpiCards {overview} {locale} {now} />

				<div class="ov-body">
					<div class="ov-body__main">
						<AttentionCard class="ov-order-1" {rows} />
						<ActivityCard class="ov-order-2" feed={overview.feed} {locale} {now} />
						<ReportingChart
							class="ov-order-4"
							hourly={overview.hourly}
							total={overview.devices.total}
							{locale}
						/>
					</div>
					<div class="ov-body__side">
						<BreakdownCard class="ov-order-3" {overview} />
						<LocationsCard class="ov-order-5" locations={overview.locations} />
						<NotesCard class="ov-order-6" notes={overview.notes} {locale} {now} />
						<ReportsCard class="ov-order-7" reports={overview.reports.recent} {locale} {now} />
					</div>
				</div>
			</div>

			<a class="ov-button ov-button--block ov-narrow-only" href={resolve('/')}>
				{m.overview_open_dashboard()}<OverviewIcon name="arrow" size={16} />
			</a>
		{/if}
	</div>
</AppPage>

<style>
	.ov {
		container: overview / inline-size;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
		min-width: 0;
		color: var(--cw-text-primary);
	}

	/* Phones: the shell is edge-to-edge, the design keeps a 16px gutter. */
	@media (max-width: 639px) {
		.ov {
			padding: var(--cw-space-5) var(--cw-space-4) var(--cw-space-8);
		}
	}

	.ov-range-dependent {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
		transition: opacity var(--cw-duration-fast) var(--cw-ease-default);
	}

	.ov--loading .ov-range-dependent {
		opacity: 0.6;
	}

	.ov-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--cw-space-4);
	}

	.ov-header__titles {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-1);
		min-width: 0;
	}

	.ov-header__eyebrow {
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--cw-text-muted);
	}

	.ov-header__title {
		margin: 0;
		font-size: var(--cw-text-3xl);
		font-weight: var(--cw-font-bold);
		letter-spacing: -0.02em;
		line-height: var(--cw-leading-tight);
	}

	.ov-header__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.ov-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--cw-space-2);
		min-height: 2.75rem;
		padding: 0 var(--cw-space-4);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-button-primary-bg);
		border: 1px solid var(--cw-button-primary-border);
		color: var(--cw-button-primary-text);
		box-shadow: var(--cw-button-primary-shadow);
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		text-decoration: none;
	}

	.ov-button:hover {
		background: var(--cw-button-primary-bg-hover);
		border-color: var(--cw-button-primary-border-hover);
		color: var(--cw-button-primary-text-hover);
	}

	.ov-button:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.ov-button--block {
		min-height: var(--cw-control-h-lg);
		font-size: 0.9375rem;
	}

	.ov-body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--cw-space-4);
	}

	.ov-body__main {
		flex: 999 1 35rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.ov-body__side {
		flex: 1 1 21.25rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	@container overview (width >= 640px) {
		.ov :global(.ov-narrow-only) {
			display: none !important;
		}
	}

	/* Phone: one column in the design's phone order. The two columns dissolve
	   (display: contents) so their sections can interleave. */
	@container overview (width < 640px) {
		.ov :global(.ov-wide-only) {
			display: none !important;
		}

		/* The title on the left, the dashboard link on the right, on one row. */
		.ov-header {
			flex-wrap: nowrap;
			align-items: center;
		}

		.ov-header__actions .ov-button {
			flex: none;
			white-space: nowrap;
		}

		.ov-header__eyebrow {
			font-size: 0.6875rem;
		}

		.ov-header__title {
			font-size: 1.625rem;
			line-height: 1.15;
		}

		.ov-range-dependent {
			gap: 0.875rem;
		}

		.ov-body {
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: stretch;
			gap: 0.875rem;
		}

		.ov-body__main,
		.ov-body__side {
			display: contents;
		}

		.ov-body :global(.ov-order-1) {
			order: 1;
		}

		.ov-body :global(.ov-order-2) {
			order: 2;
		}

		.ov-body :global(.ov-order-3) {
			order: 3;
		}

		.ov-body :global(.ov-order-4) {
			order: 4;
		}

		.ov-body :global(.ov-order-5) {
			order: 5;
		}

		.ov-body :global(.ov-order-6) {
			order: 6;
		}

		.ov-body :global(.ov-order-7) {
			order: 7;
		}
	}
</style>
