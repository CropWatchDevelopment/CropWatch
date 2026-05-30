/**
 * Localized label builders for `@cropwatchdevelopment/cwui` components.
 *
 * CWUI components keep their text out of the component and accept a `labels`
 * prop (English defaults). These builders translate that surface via Paraglide
 * so every call site is a one-liner: `labels={cwDataTableLabels()}`.
 *
 * Call the builder INSIDE the template (e.g. `labels={cwDataTableLabels()}`) so
 * it re-evaluates on locale change, exactly like a bare `m.key()` call.
 */
import { m } from '$lib/paraglide/messages.js';
import type {
	CwDataTableLabels,
	CwResponsiveLineChartLabels,
	CwDonutChartLabels,
	CwHeatmapLabels,
	CwPPFDChartLabels,
	DliCardLabels,
	CwVPDChartLabels,
	CwOfflineOverlayLabels,
	CwCalendarScrollLabels,
	CwDateTimeRangePickerLabels,
	CwCopyLabels,
	CwWindCompassLabels
} from '@cropwatchdevelopment/cwui';

export function cwDataTableLabels(): CwDataTableLabels {
	return {
		searchPlaceholder: m.cwui_table_search(),
		loading: m.cwui_table_loading(),
		loadingMore: m.cwui_table_loading_more(),
		noSort: m.cwui_table_no_sort(),
		sortAscOption: (header) => m.cwui_table_sort_asc({ header }),
		sortDescOption: (header) => m.cwui_table_sort_desc({ header }),
		pageSizeOption: (n) => m.cwui_table_page_size({ n }),
		pageSizeBatchOption: (n) => m.cwui_table_page_size_batch({ n }),
		toolbarMenu: m.cwui_table_toolbar_menu(),
		columnsSettings: m.cwui_table_columns_settings(),
		refresh: m.cwui_table_refresh(),
		actions: m.cwui_table_actions(),
		errorPrefix: (message) => m.cwui_table_error_prefix({ message }),
		retry: m.cwui_table_retry(),
		empty: m.cwui_table_empty(),
		genericError: m.cwui_table_generic_error(),
		loadMoreError: m.cwui_table_load_more_error(),
		groupCount: (count) => m.cwui_table_group_count({ count }),
		paginationRange: (from, to, total) => m.cwui_table_range({ from, to, total }),
		virtualRange: (from, to, total) => m.cwui_table_range({ from, to, total }),
		virtualRangeLoaded: (from, to) => m.cwui_table_range_loaded({ from, to }),
		loadInterrupted: m.cwui_table_load_interrupted(),
		scrollToLoadMore: m.cwui_table_scroll_to_load_more(),
		allRowsLoaded: (total) => m.cwui_table_all_rows_loaded({ total }),
		allLoadedVisible: m.cwui_table_all_loaded_visible(),
		previousPage: m.cwui_table_previous_page(),
		nextPage: m.cwui_table_next_page(),
		pageOf: (page, totalPages) => m.cwui_table_page_of({ page, totalPages }),
		columnSettingsCopy: m.cwui_table_column_settings_copy(),
		visibleColumns: m.cwui_table_visible_columns(),
		selectAtLeastOne: m.cwui_table_select_at_least_one(),
		close: m.cwui_table_close(),
		resetToDefault: m.cwui_table_reset_default(),
		save: m.cwui_table_save()
	};
}

export function cwResponsiveLineChartLabels(): CwResponsiveLineChartLabels {
	return {
		range1h: m.cwui_chart_range_1h(),
		range24h: m.cwui_chart_range_24h(),
		range7d: m.cwui_chart_range_7d(),
		rangeGroupAria: m.cwui_chart_range_group_aria(),
		toggleThemeAria: m.cwui_chart_toggle_theme_aria(),
		sensorsOnOf: (on, total) => m.cwui_chart_sensors_on_of({ on, total }),
		anomaly: m.cwui_chart_anomaly(),
		dataGap: m.cwui_chart_data_gap(),
		noSignal: m.cwui_chart_no_signal(),
		zoomHint: m.cwui_chart_zoom_hint(),
		lastSensorTitle: () => m.cwui_chart_last_sensor(),
		hideSeries: (label) => m.cwui_chart_hide_series({ label }),
		showSeries: (label) => m.cwui_chart_show_series({ label })
	};
}

export function cwDonutChartLabels(): CwDonutChartLabels {
	return {
		ariaLabel: m.cwui_donut_aria(),
		total: m.cwui_donut_total(),
		ofTotal: (total) => m.cwui_donut_of_total({ total }),
		segmentLabel: (label, value) => m.cwui_donut_segment({ label, value })
	};
}

export function cwHeatmapLabels(): CwHeatmapLabels {
	return {
		title: m.cwui_heatmap_title(),
		noData: m.cwui_heatmap_no_data()
	};
}

export function cwPpfdChartLabels(): CwPPFDChartLabels {
	return {
		eyebrow: m.cwui_ppfd_eyebrow(),
		heading: m.cwui_ppfd_heading(),
		headingWithPlant: (plant) => m.cwui_ppfd_heading_plant({ plant }),
		currentPpfd: m.cwui_ppfd_current(),
		current: m.cwui_ppfd_current_marker(),
		dliReading: m.cwui_ppfd_dli_reading(),
		dliStat: m.cwui_ppfd_dli_stat(),
		targetRange: m.cwui_ppfd_target_range(),
		status: m.cwui_ppfd_status(),
		tooLow: m.cwui_ppfd_too_low(),
		tooHigh: m.cwui_ppfd_too_high(),
		optimal: m.cwui_ppfd_optimal(),
		insideBand: m.cwui_ppfd_inside_band(),
		deltaBelow: (amount, unit) => m.cwui_ppfd_delta_below({ amount, unit }),
		deltaAbove: (amount, unit) => m.cwui_ppfd_delta_above({ amount, unit }),
		updated: (when) => m.cwui_ppfd_updated({ when })
	};
}

export function cwDliCardLabels(): DliCardLabels {
	return {
		title: m.cwui_dli_title(),
		statusVeryLow: m.cwui_dli_status_very_low(),
		statusSlightlyLow: m.cwui_dli_status_slightly_low(),
		statusLow: m.cwui_dli_status_low(),
		statusGood: m.cwui_dli_status_good(),
		statusHigh: m.cwui_dli_status_high(),
		statusVeryHigh: m.cwui_dli_status_very_high(),
		statusPrefix: m.cwui_dli_status_prefix(),
		historyTitle: m.cwui_dli_history_title(),
		historyListLabel: m.cwui_dli_history_list(),
		historyCount: (days) => m.cwui_dli_history_count({ days }),
		targetForCrop: (cropName, range) => m.cwui_dli_target_crop({ crop: cropName, range }),
		target: (range) => m.cwui_dli_target({ range }),
		valueAriaLabel: (value, unit, targetText, status) =>
			m.cwui_dli_value_aria({ value, unit, target: targetText, status }),
		barAriaLabel: (scaleMax, value, unit, range, status) =>
			m.cwui_dli_bar_aria({ scaleMax, value, unit, range, status })
	};
}

export function cwVpdChartLabels(): CwVPDChartLabels {
	return {
		caption: m.cwui_vpd_caption(),
		zones: {
			wet: m.cwui_vpd_zone_wet(),
			humid: m.cwui_vpd_zone_humid(),
			balanced: m.cwui_vpd_zone_balanced(),
			optimal: m.cwui_vpd_zone_optimal(),
			firm: m.cwui_vpd_zone_firm(),
			dry: m.cwui_vpd_zone_dry(),
			stress: m.cwui_vpd_zone_stress()
		},
		cellAriaLabel: ({ temperatureC, humidity, vpd, unit, zoneLabel, inTarget, isCurrent }) =>
			m.cwui_vpd_cell({ t: temperatureC, h: humidity, vpd, unit, zone: zoneLabel }) +
			(inTarget ? m.cwui_vpd_cell_in_target() : '') +
			(isCurrent ? m.cwui_vpd_cell_current() : '')
	};
}

export function cwOfflineOverlayLabels(): CwOfflineOverlayLabels {
	return {
		title: m.cwui_offline_title(),
		message: m.cwui_offline_message(),
		retryLabel: m.cwui_offline_retry(),
		footnote: m.cwui_offline_footnote(),
		helpTitle: m.cwui_offline_help_title(),
		helpItemWifi: m.cwui_offline_help_wifi(),
		helpItemRouter: m.cwui_offline_help_router(),
		helpItemMobileData: m.cwui_offline_help_mobile(),
		reconnectedTitle: m.cwui_offline_reconnected_title(),
		reconnectedSubtitle: m.cwui_offline_reconnected_subtitle()
	};
}

export function cwCalendarScrollLabels(): CwCalendarScrollLabels {
	return {
		ariaLabel: m.cwui_cal_aria(),
		today: m.cwui_cal_today(),
		dataAvailable: m.cwui_cal_data_available(),
		noData: m.cwui_cal_no_data(),
		rowAriaLabel: (key, status) => m.cwui_cal_row_aria({ key, status }),
		actionsAriaLabel: (key) => m.cwui_cal_actions_aria({ key }),
		contentPlaceholder: m.cwui_cal_content_placeholder(),
		noDataForDate: m.cwui_cal_no_data_for_date(),
		emptyTitle: m.cwui_cal_empty_title(),
		emptyCopy: m.cwui_cal_empty_copy()
	};
}

export function cwDateTimeRangePickerLabels(): CwDateTimeRangePickerLabels {
	return {
		placeholder: m.cwui_dtr_placeholder(),
		dialog: m.cwui_dtr_dialog(),
		previous: m.cwui_dtr_previous(),
		next: m.cwui_dtr_next(),
		time: m.cwui_dtr_time(),
		startTime: m.cwui_dtr_start_time(),
		endTime: m.cwui_dtr_end_time(),
		cancel: m.cwui_dtr_cancel(),
		set: m.cwui_dtr_set()
	};
}

export function cwWindCompassLabels(): CwWindCompassLabels {
	const cardinals = m.cwui_wind_cardinals().split(',');
	const [cn, ce, cs, cw] = m.cwui_wind_cardinal_letters().split(',');
	const beaufortNames = m.cwui_wind_beaufort_names().split(',');
	return {
		eyebrow: m.cwui_wind_eyebrow(),
		headingFallback: m.cwui_wind_heading_fallback(),
		heading: (location) => m.cwui_wind_heading({ location }),
		beaufortPill: (force, label) => m.cwui_wind_pill({ force, label }),
		readingLabel: (word) => m.cwui_wind_reading({ word }),
		updatedLabel: (formatted) => m.cwui_wind_updated({ formatted }),
		conventionFrom: m.cwui_wind_from(),
		conventionTo: m.cwui_wind_to(),
		statDirection: m.cwui_wind_stat_direction(),
		statHeading: (word) => m.cwui_wind_stat_heading({ word }),
		statSpeed: m.cwui_wind_stat_speed(),
		statBeaufort: m.cwui_wind_stat_beaufort(),
		statBeaufortValue: (force, label) => m.cwui_wind_stat_beaufort_value({ force, label }),
		statConditions: m.cwui_wind_stat_conditions(),
		cardinals,
		cardinalLetters: { n: cn, e: ce, s: cs, w: cw },
		beaufortNames,
		srWind: (word, direction, cardinal) => m.cwui_wind_sr_wind({ word, direction, cardinal }),
		srSpeed: (speed) => m.cwui_wind_sr_speed({ speed }),
		srBeaufort: (force, label) => m.cwui_wind_sr_beaufort({ force, label })
	};
}

export function cwCopyLabels(): CwCopyLabels {
	return {
		copy: m.cwui_copy_copy(),
		copied: m.cwui_copy_copied(),
		copiedFeedback: m.cwui_copy_feedback()
	};
}
