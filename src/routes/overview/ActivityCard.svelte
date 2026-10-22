<script lang="ts">
	import { useCwToast } from '@cropwatchdevelopment/cwui';
	import type { OverviewDto, OverviewFeedItemDto } from '$lib/api/api.dtos';
	import { formatRelative } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { getServices } from '$lib/services/context';
	import OverviewIcon, { type OverviewIconName } from './OverviewIcon.svelte';
	import OverviewSection from './OverviewSection.svelte';
	import {
		feedTimeLabel,
		feedTone,
		filterFeed,
		FEED_FILTERS,
		formatCompact,
		formatDuration,
		formatReportPeriod,
		type FeedFilter,
		type Tone
	} from './overview';
	import { deviceHref, openReport } from './overview-links';

	interface Props {
		feed: OverviewDto['feed'];
		locale: string;
		now: number;
		class?: string;
	}

	let { feed, locale, now, class: className = '' }: Props = $props();

	/** Desktop shows this many; the phone timeline shows six (CSS). */
	const LIMIT = 8;

	let filter = $state<FeedFilter>('all');

	const { reports } = getServices();
	const toast = useCwToast();
	/** The event whose report is being opened. */
	let opening = $state<string | null>(null);

	async function openEventReport(key: string, report: { devEui: string; file: string }) {
		if (opening) return;
		opening = key;
		try {
			await openReport(reports, report.devEui, report.file, toast);
		} finally {
			opening = null;
		}
	}

	const filterLabel: Record<FeedFilter, () => string> = {
		all: m.overview_filter_all,
		alert: m.overview_filter_alerts,
		report: m.overview_filter_reports,
		data: m.overview_filter_data,
		device: m.overview_filter_devices
	};

	const counts = $derived({
		...feed.counts,
		all: feed.counts.alert + feed.counts.report + feed.counts.data + feed.counts.device
	});

	const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

	function since(from: string | null | undefined, to: string): string | null {
		const ms = from ? Date.parse(to) - Date.parse(from) : NaN;
		return Number.isFinite(ms) ? formatDuration(ms) : null;
	}

	function describe(item: OverviewFeedItemDto): {
		icon: OverviewIconName;
		tone: Tone;
		title: string;
		meta: string;
	} {
		const device = item.deviceName ?? m.dashboard_unnamed_device();
		const rule = item.ruleName ? m.overview_event_rule({ rule: item.ruleName }) : null;
		const tone = feedTone(item.kind);
		switch (item.kind) {
			case 'alert_triggered':
				return {
					icon: 'bell',
					tone,
					title: m.overview_event_alert_triggered({ device }),
					meta: join(rule, item.locationName)
				};
			case 'alert_resolved': {
				const duration = since(item.triggeredAt, item.at);
				return {
					icon: 'check',
					tone,
					title: m.overview_event_alert_resolved({ device }),
					meta: join(rule, duration && m.overview_event_active_for({ duration }))
				};
			}
			case 'device_offline': {
				const when = formatRelative(item.lastSeenAt ?? null, now, locale);
				return {
					icon: 'device',
					tone,
					title: m.overview_event_device_offline({ device }),
					meta: join(when && m.overview_event_last_seen({ when }), item.locationName)
				};
			}
			case 'device_online': {
				const duration = since(item.lastSeenAt, item.at);
				return {
					icon: 'device',
					tone,
					title: m.overview_event_device_online({ device }),
					meta: join(duration && m.overview_event_offline_for({ duration }), item.locationName)
				};
			}
			case 'report': {
				const period = formatReportPeriod(item.file ?? '', locale);
				return {
					icon: 'send',
					tone,
					title: m.overview_event_report_sent({ device }),
					meta: join(period && m.overview_event_report_meta({ period }), item.locationName)
				};
			}
			case 'data_hour':
				return {
					icon: 'pulse',
					tone,
					title: m.overview_event_data_hour({
						reporting: item.reporting ?? 0,
						total: item.total ?? 0
					}),
					meta: m.overview_event_all_locations()
				};
			default:
				return {
					icon: 'pulse',
					tone,
					title: m.overview_event_data_day({
						reporting: item.reporting ?? 0,
						total: item.total ?? 0,
						uplinks: formatCompact(item.uplinks ?? 0, locale)
					}),
					meta: m.overview_event_data_day_meta({
						time: new Intl.DateTimeFormat(locale, {
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit',
							hourCycle: 'h23'
						}).format(new Date(item.at))
					})
				};
		}
	}

	const events = $derived(
		filterFeed(feed.items, filter, LIMIT).map((item, index) => ({
			...describe(item),
			// Two rules can fire on one device in the same instant.
			key: `${index}:${item.kind}:${item.at}`,
			time: feedTimeLabel(item.at, now, locale, m.overview_yesterday()),
			// Alerts and device events open the device; a report opens its PDF.
			href:
				item.kind.startsWith('alert_') || item.kind.startsWith('device_')
					? deviceHref(item.devEui, item.locationId)
					: null,
			report:
				item.kind === 'report' && item.devEui && item.file
					? { devEui: item.devEui, file: item.file }
					: null
		}))
	);
	type FeedEvent = (typeof events)[number];
</script>

{#snippet row(event: FeedEvent)}
	<span class={`event__icon event__icon--${event.tone}`}>
		<OverviewIcon name={event.icon} size={16} />
	</span>
	<span class="event__body">
		<span class="event__head">
			<span class="event__title">{event.title}</span>
			<time class="event__time event__time--narrow">{event.time}</time>
		</span>
		<span class="event__meta">{event.meta}</span>
	</span>
	<time class="event__time event__time--wide">{event.time}</time>
{/snippet}

<OverviewSection
	title={m.overview_activity_title()}
	subtitle={m.overview_activity_subtitle()}
	stackOnPhone
	class={className}
>
	{#snippet actions()}
		<div class="filters" role="group" aria-label={m.overview_activity_filter_label()}>
			{#each FEED_FILTERS as option (option)}
				<button
					type="button"
					class="filters__chip"
					aria-pressed={filter === option}
					onclick={() => (filter = option)}
				>
					{filterLabel[option]()}<span class="filters__count">{counts[option]}</span>
				</button>
			{/each}
		</div>
	{/snippet}

	{#if events.length === 0}
		<p class="events-empty">{m.overview_activity_empty()}</p>
	{:else}
		<ol class="events">
			{#each events as event (event.key)}
				<li class="event">
					<span class="event__line" aria-hidden="true"></span>
					{#if event.href}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- deviceHref() resolves the path -->
						<a class="event__row event__row--link" href={event.href}>{@render row(event)}</a>
					{:else if event.report}
						{@const report = event.report}
						<button
							type="button"
							class="event__row event__row--link"
							aria-busy={opening === event.key}
							onclick={() => openEventReport(event.key, report)}
						>
							{@render row(event)}
						</button>
					{:else}
						<div class="event__row">{@render row(event)}</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</OverviewSection>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.filters__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: var(--cw-control-h-sm);
		padding: 0 var(--cw-space-3);
		border-radius: var(--cw-radius-pill);
		font: inherit;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		cursor: pointer;
		border: 1px solid var(--cw-border-muted);
		background: var(--cw-bg-surface-elevated);
		color: var(--cw-text-secondary);
	}

	.filters__chip[aria-pressed='true'] {
		border-color: var(--cw-button-primary-border);
		background: var(--cw-button-primary-bg);
		color: var(--cw-button-primary-text);
	}

	.filters__chip:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.filters__count {
		font-size: 0.6875rem;
		font-weight: var(--cw-font-semibold);
		opacity: 0.8;
	}

	.events {
		list-style: none;
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
	}

	.events-empty {
		margin: 0;
		padding: var(--cw-space-4) var(--cw-space-6) var(--cw-space-5);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.event {
		position: relative;
	}

	.event__row {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		padding: var(--cw-space-2) 0;
	}

	/* Rows that open something: a hover surface that reaches just past the
	   content, so the icons stay where the plain rows have them. */
	.event__row--link {
		box-sizing: border-box;
		width: calc(100% + 2 * var(--cw-space-2));
		margin: 0 calc(-1 * var(--cw-space-2));
		padding-inline: var(--cw-space-2);
		border: 0;
		border-radius: var(--cw-radius-lg);
		background: none;
		font: inherit;
		text-align: left;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.event__row--link:hover {
		background: var(--cw-bg-surface-elevated);
	}

	.event__row--link:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.event__line {
		display: none;
	}

	.event__icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--cw-control-h-sm);
		height: var(--cw-control-h-sm);
		border-radius: var(--cw-radius-full);
		flex: none;
	}

	.event__icon--danger {
		background: var(--cw-tone-danger-bg-subtle);
		color: var(--cw-tone-danger-text);
	}

	.event__icon--success {
		background: var(--cw-tone-success-bg-subtle);
		color: var(--cw-tone-success-text);
	}

	.event__icon--warning {
		background: var(--cw-tone-warning-bg-subtle);
		color: var(--cw-tone-warning-text);
	}

	.event__icon--info {
		background: var(--cw-tone-info-bg-subtle);
		color: var(--cw-tone-info-text);
	}

	.event__icon--secondary {
		background: var(--cw-tone-secondary-bg-subtle);
		color: var(--cw-tone-secondary-text);
	}

	.event__body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.event__title {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-text-primary);
	}

	.event__meta {
		font-size: 0.8125rem;
		color: var(--cw-text-muted);
	}

	.event__time {
		flex: none;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		color: var(--cw-text-muted);
		white-space: nowrap;
	}

	.event__time--wide {
		padding-top: 0.1875rem;
	}

	.event__time--narrow {
		display: none;
	}

	/* Phone: a timeline of the newest six, filters scroll sideways. */
	@container overview (width < 640px) {
		.filters {
			flex-wrap: nowrap;
			gap: var(--cw-space-2);
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			/* Snap to the gutter, not the screen edge. */
			scroll-padding-inline: var(--cw-space-4);
			scrollbar-width: none;
			margin: 0 calc(-1 * var(--cw-space-4));
			padding: 0 var(--cw-space-4);
		}

		.filters::-webkit-scrollbar {
			display: none;
		}

		.filters__chip {
			flex: none;
			scroll-snap-align: start;
			min-height: 2.25rem;
			padding: 0 0.875rem;
			font-size: 0.8125rem;
		}

		.events {
			padding: var(--cw-space-3) var(--cw-space-4) var(--cw-space-2);
		}

		.events-empty {
			padding: var(--cw-space-3) var(--cw-space-4) var(--cw-space-4);
		}

		.event__row {
			gap: var(--cw-space-3);
			padding-block: 0 0.875rem;
		}

		.event:nth-child(n + 7) {
			display: none;
		}

		.event:not(:last-child):not(:nth-child(6)) .event__line {
			display: block;
			position: absolute;
			left: 0.9375rem;
			top: 2.125rem;
			bottom: 0;
			width: 2px;
			border-radius: 2px;
			background: var(--cw-border-muted);
		}

		.event__icon {
			box-shadow: 0 0 0 3px var(--cw-bg-surface);
		}

		.event__body {
			padding-top: 1px;
		}

		.event__head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: var(--cw-space-2);
		}

		.event__title {
			line-height: 1.35;
		}

		.event__meta {
			font-size: var(--cw-text-xs);
		}

		.event__time--wide {
			display: none;
		}

		.event__time--narrow {
			display: inline;
			font-size: 0.6875rem;
		}
	}
</style>
