<script lang="ts">
	import {
		CwStackedBarChart,
		type CwStackedBarBucket,
		type CwStackedBarCategory
	} from '@cropwatchdevelopment/cwui';
	import { formatNumber } from '$lib/i18n/format';
	import { cwStackedBarChartLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import { appTheme } from '$lib/theme/appTheme.svelte';
	import {
		metricLabel,
		readNumber,
		toHourKey,
		trafficClassColor,
		TRAFFIC_CLASS_KEYS,
		type HourlyTrafficRow
	} from './traffic-data';

	interface Props {
		hourlyRows: HourlyTrafficRow[];
		classKeys: string[];
		/** Local midnight of the displayed day. */
		dayStart: Date;
	}

	let { hourlyRows, classKeys, dayStart }: Props = $props();

	// Color follows the class's fixed slot in TRAFFIC_CLASS_KEYS (falling back
	// to list position for discovered keys) so it matches the breakdown card
	// and never changes as classes come and go.
	const categories = $derived<CwStackedBarCategory[]>(
		classKeys.map((key, index) => ({
			id: key,
			label: metricLabel(key),
			color: trafficClassColor(
				appTheme.current,
				TRAFFIC_CLASS_KEYS.indexOf(key as (typeof TRAFFIC_CLASS_KEYS)[number]) >= 0
					? TRAFFIC_CLASS_KEYS.indexOf(key as (typeof TRAFFIC_CLASS_KEYS)[number])
					: index
			)
		}))
	);

	// Always render the full 00–23 axis so quiet hours read as quiet, not missing.
	const buckets = $derived<CwStackedBarBucket[]>(
		Array.from({ length: 24 }, (_, hour) => {
			const hourDate = new Date(
				dayStart.getFullYear(),
				dayStart.getMonth(),
				dayStart.getDate(),
				hour
			);
			const row = hourlyRows.find((r) => r.id === toHourKey(hourDate));
			return {
				key: hourDate.toISOString(),
				label: `${String(hour).padStart(2, '0')}`,
				values: Object.fromEntries(
					classKeys.map((key) => [key, row ? (readNumber(row[key]) ?? 0) : 0])
				)
			};
		})
	);

	const hasAnyData = $derived(hourlyRows.some((row) => row.total_traffic > 0));
</script>

<CwStackedBarChart
	{categories}
	{buckets}
	theme={appTheme.current}
	height={300}
	formatValue={formatNumber}
	labels={cwStackedBarChartLabels()}
	noData={hasAnyData ? false : m.traffic_no_data_today()}
/>
