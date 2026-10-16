<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewIcon from './OverviewIcon.svelte';
	import OverviewSection from './OverviewSection.svelte';
	import {
		whereText,
		type AttentionKey,
		type AttentionRow,
		type AttentionTarget
	} from './overview';

	interface Props {
		rows: AttentionRow[];
		class?: string;
	}

	let { rows, class: className = '' }: Props = $props();

	type Tone = 'danger' | 'warning';

	interface RowView {
		key: AttentionKey;
		tone: Tone;
		tag: string;
		count: string;
		text: string;
		short: string;
		where: string;
		href: string;
	}

	function hrefFor(target: AttentionTarget): string {
		switch (target.kind) {
			case 'location':
				return resolve('/locations/[location_id]', { location_id: String(target.locationId) });
			case 'rules':
				return resolve('/rules');
			case 'gateways':
				return resolve('/gateways');
			default:
				return resolve('/');
		}
	}

	function describe(row: AttentionRow): RowView {
		const one = row.count === 1;
		const where = whereText(row.groups, m.dashboard_no_location(), (count) =>
			m.overview_attention_more({ count })
		);
		const base = { key: row.key, where, href: hrefFor(row.target) };
		switch (row.key) {
			case 'offline':
				return {
					...base,
					tone: 'danger',
					tag: m.overview_attention_tag_offline(),
					count: one
						? m.overview_attention_devices_one()
						: m.overview_attention_devices_other({ count: row.count }),
					text: one
						? m.overview_attention_offline_text_one()
						: m.overview_attention_offline_text_other(),
					short: one
						? m.overview_health_offline_one()
						: m.overview_health_offline_other({ count: row.count })
				};
			case 'alerts':
				return {
					...base,
					tone: 'warning',
					tag: m.overview_attention_tag_alert(),
					count: one
						? m.overview_attention_rules_one()
						: m.overview_attention_rules_other({ count: row.count }),
					text: one
						? m.overview_attention_alert_text_one()
						: m.overview_attention_alert_text_other(),
					short: one
						? m.overview_health_alerts_one()
						: m.overview_health_alerts_other({ count: row.count })
				};
			default:
				return {
					...base,
					tone: 'danger',
					tag: m.overview_attention_tag_gateway(),
					count: one
						? m.overview_attention_gateways_one()
						: m.overview_attention_gateways_other({ count: row.count }),
					text: one
						? m.overview_attention_gateway_text_one()
						: m.overview_attention_gateway_text_other(),
					short: one
						? m.overview_health_gateways_offline_one()
						: m.overview_health_gateways_offline_other({ count: row.count }),
					where: m.overview_attention_all_gateways()
				};
		}
	}

	const views = $derived(rows.map(describe));
</script>

<OverviewSection
	id="attention"
	title={m.overview_attention_title()}
	subtitle={m.overview_attention_subtitle()}
	class={className}
>
	{#if views.length === 0}
		<div class="att-none">
			<OverviewIcon name="check" size={16} />
			<span>{m.overview_attention_none()}</span>
		</div>
	{:else}
		<ul class="att-list att-list--wide">
			{#each views as view (view.key)}
				<li class="att">
					<span class={`att__chip att__chip--${view.tone}`}>
						<span class={`att__dot att__dot--${view.key}`}></span>{view.tag}
					</span>
					<span class="att__text"><strong>{view.count}</strong> {view.text}</span>
					<span class="att__where">{view.where}</span>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- hrefFor() resolves the path -->
					<a class="att__view" href={view.href}>{m.action_view()}</a>
				</li>
			{/each}
		</ul>
		<ul class="att-list att-list--narrow">
			{#each views as view (view.key)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- hrefFor() resolves the path -->
					<a class="att-row" href={view.href}>
						<span class={`att-row__tile att-row__tile--${view.tone}`}>
							<span class={`att__dot att__dot--${view.key} att__dot--large`}></span>
						</span>
						<span class="att-row__body">
							<span class="att-row__title">{view.short}</span>
							<span class="att-row__where">{view.where}</span>
						</span>
						<OverviewIcon name="chevron" size={16} class="att-row__chevron" />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</OverviewSection>

<style>
	.att-list {
		list-style: none;
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.att-list--narrow {
		display: none;
	}

	.att {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-3);
		padding: 0.625rem var(--cw-space-3);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface-elevated);
		border: 1px solid var(--cw-border-muted);
	}

	.att__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: var(--cw-space-1) var(--cw-space-3);
		border-radius: var(--cw-radius-pill);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		white-space: nowrap;
	}

	.att__chip--danger {
		background: var(--cw-tone-danger-bg-subtle);
		color: var(--cw-tone-danger-text);
	}

	.att__chip--warning {
		background: var(--cw-tone-warning-bg-subtle);
		color: var(--cw-tone-warning-text);
	}

	.att__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
		flex: none;
	}

	.att__dot--large {
		width: 0.625rem;
		height: 0.625rem;
	}

	.att__dot--offline,
	.att__dot--gateways {
		background: var(--cw-status-offline);
	}

	.att__dot--alerts {
		background: var(--cw-status-warning);
	}

	.att__text {
		flex: 1 1 13.75rem;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-primary);
	}

	.att__text strong {
		font-weight: var(--cw-font-semibold);
	}

	.att__where {
		font-size: 0.8125rem;
		color: var(--cw-text-muted);
	}

	.att__view {
		display: inline-flex;
		align-items: center;
		min-height: var(--cw-control-h-sm);
		padding: 0 var(--cw-space-3);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-button-secondary-bg);
		border: 1px solid var(--cw-button-secondary-border);
		color: var(--cw-button-secondary-text);
		box-shadow: var(--cw-button-secondary-shadow);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		text-decoration: none;
	}

	.att__view:hover {
		background: var(--cw-button-secondary-bg-hover);
		border-color: var(--cw-button-secondary-border-hover);
		color: var(--cw-button-secondary-text-hover);
	}

	.att__view:focus-visible,
	.att-row:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-focus-ring-color);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.att-none {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		margin: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		padding: 0.625rem var(--cw-space-3);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-tone-success-bg-subtle);
		border: 1px solid var(--cw-tone-success-border);
		color: var(--cw-tone-success-text);
		font-size: var(--cw-text-sm);
	}

	.att-row {
		display: flex;
		align-items: center;
		gap: var(--cw-space-3);
		min-height: 3.5rem;
		padding: var(--cw-space-2);
		border-radius: var(--cw-radius-lg);
		color: var(--cw-text-primary);
		text-decoration: none;
	}

	.att-row:hover {
		background: var(--cw-bg-surface-elevated);
	}

	.att-row__tile {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--cw-radius-full);
		flex: none;
	}

	.att-row__tile--danger {
		background: var(--cw-tone-danger-bg-subtle);
	}

	.att-row__tile--warning {
		background: var(--cw-tone-warning-bg-subtle);
	}

	.att-row__body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.att-row__title {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
	}

	.att-row__where {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.att-row :global(.att-row__chevron) {
		color: var(--cw-text-muted);
		flex: none;
	}

	@container overview (width < 640px) {
		.att-list--wide {
			display: none;
		}

		.att-list--narrow {
			display: block;
			padding: var(--cw-space-1) var(--cw-space-2) var(--cw-space-2);
		}

		.att-none {
			margin: var(--cw-space-3) var(--cw-space-4) var(--cw-space-4);
		}
	}
</style>
