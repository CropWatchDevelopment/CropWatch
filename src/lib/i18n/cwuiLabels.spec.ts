import { describe, expect, it } from 'vitest';
import { CW_EMPTY_VALUE } from '@cropwatchdevelopment/cwui';
import { m } from '$lib/paraglide/messages.js';
import {
	cwCalendarLabels,
	cwCalendarScrollLabels,
	cwCopyLabels,
	cwDataTableLabels,
	cwDateTimeRangePickerLabels,
	cwDliCardLabels,
	cwDonutChartLabels,
	cwDropdownLabels,
	cwHeatmapLabels,
	cwInputLabels,
	cwLocationCardLabels,
	cwMultiSelectLabels,
	cwOfflineOverlayLabels,
	cwPpfdChartLabels,
	cwResponsiveLineChartLabels,
	cwSearchInputLabels,
	cwSensorCardLabels,
	cwSideNavLabels,
	cwStackedBarChartLabels,
	cwStatCardLabels,
	cwThemePickerLabels,
	cwVpdChartLabels,
	cwWindCompassLabels
} from './cwuiLabels';

const fn = expect.any(Function);

describe('cwDataTableLabels', () => {
	it('translates every data table string', () => {
		expect(cwDataTableLabels()).toEqual({
			searchPlaceholder: m.cwui_table_search(),
			loading: m.cwui_table_loading(),
			loadingMore: m.cwui_table_loading_more(),
			noSort: m.cwui_table_no_sort(),
			sortAscOption: fn,
			sortDescOption: fn,
			pageSizeOption: fn,
			pageSizeBatchOption: fn,
			toolbarMenu: m.cwui_table_toolbar_menu(),
			columnsSettings: m.cwui_table_columns_settings(),
			refresh: m.cwui_table_refresh(),
			actions: m.cwui_table_actions(),
			errorPrefix: fn,
			errorTitle: m.cwui_table_error_title(),
			retry: m.cwui_table_retry(),
			empty: m.cwui_table_empty(),
			noResults: fn,
			ungrouped: m.cwui_table_ungrouped(),
			genericError: m.cwui_table_generic_error(),
			loadMoreError: m.cwui_table_load_more_error(),
			groupCount: fn,
			paginationRange: fn,
			virtualRange: fn,
			virtualRangeLoaded: fn,
			loadInterrupted: m.cwui_table_load_interrupted(),
			scrollToLoadMore: m.cwui_table_scroll_to_load_more(),
			allRowsLoaded: fn,
			allLoadedVisible: m.cwui_table_all_loaded_visible(),
			previousPage: m.cwui_table_previous_page(),
			nextPage: m.cwui_table_next_page(),
			pageOf: fn,
			columnSettingsCopy: m.cwui_table_column_settings_copy(),
			visibleColumns: m.cwui_table_visible_columns(),
			selectAtLeastOne: m.cwui_table_select_at_least_one(),
			close: m.cwui_table_close(),
			resetToDefault: m.cwui_table_reset_default(),
			save: m.cwui_table_save()
		});
	});

	it('fills the templated strings with the values the table passes', () => {
		const labels = cwDataTableLabels();

		expect(labels.sortAscOption!('Name')).toBe(m.cwui_table_sort_asc({ header: 'Name' }));
		expect(labels.sortDescOption!('Name')).toBe(m.cwui_table_sort_desc({ header: 'Name' }));
		expect(labels.pageSizeOption!(25)).toBe(m.cwui_table_page_size({ n: 25 }));
		expect(labels.pageSizeBatchOption!(50)).toBe(m.cwui_table_page_size_batch({ n: 50 }));
		expect(labels.errorPrefix!('Timeout')).toBe(m.cwui_table_error_prefix({ message: 'Timeout' }));
		expect(labels.noResults!('probe')).toBe(m.cwui_table_no_results({ query: 'probe' }));
		expect(labels.groupCount!(3)).toBe(m.cwui_table_group_count({ count: 3 }));
		expect(labels.paginationRange!(1, 25, 80)).toBe(
			m.cwui_table_range({ from: 1, to: 25, total: 80 })
		);
		expect(labels.virtualRange!(26, 50, 80)).toBe(
			m.cwui_table_range({ from: 26, to: 50, total: 80 })
		);
		expect(labels.virtualRangeLoaded!(1, 40)).toBe(m.cwui_table_range_loaded({ from: 1, to: 40 }));
		expect(labels.allRowsLoaded!(80)).toBe(m.cwui_table_all_rows_loaded({ total: 80 }));
		expect(labels.pageOf!(2, 4)).toBe(m.cwui_table_page_of({ page: 2, totalPages: 4 }));
		expect(labels.paginationRange!(1, 25, 80)).toContain('80');
	});
});

describe('cwResponsiveLineChartLabels', () => {
	it('translates every line chart string', () => {
		expect(cwResponsiveLineChartLabels()).toEqual({
			range1h: m.cwui_chart_range_1h(),
			range24h: m.cwui_chart_range_24h(),
			range7d: m.cwui_chart_range_7d(),
			rangeGroupAria: m.cwui_chart_range_group_aria(),
			toggleThemeAria: m.cwui_chart_toggle_theme_aria(),
			sensorsOnOf: fn,
			anomaly: m.cwui_chart_anomaly(),
			dataGap: m.cwui_chart_data_gap(),
			noSignal: m.cwui_chart_no_signal(),
			zoomHint: m.cwui_chart_zoom_hint(),
			statMin: m.cwui_chart_stat_min(),
			statAvg: m.cwui_chart_stat_avg(),
			statMax: m.cwui_chart_stat_max(),
			axisLeftShort: m.cwui_chart_axis_left_short(),
			axisRightShort: m.cwui_chart_axis_right_short(),
			axisLeft: m.cwui_chart_axis_left(),
			axisRight: m.cwui_chart_axis_right(),
			chart: m.cwui_chart_chart(),
			seriesSummary: fn,
			keyboardHint: m.cwui_chart_keyboard_hint(),
			loading: m.cwui_chart_loading(),
			lastSensorTitle: fn,
			hideSeries: fn,
			showSeries: fn
		});
	});

	it('fills the templated strings with the values the chart passes', () => {
		const labels = cwResponsiveLineChartLabels();

		expect(labels.sensorsOnOf!(2, 3)).toBe(m.cwui_chart_sensors_on_of({ on: 2, total: 3 }));
		expect(labels.seriesSummary!('Temp', '1', '2', '3', '4')).toBe(
			m.cwui_chart_series_summary({ label: 'Temp', min: '1', avg: '2', max: '3', latest: '4' })
		);
		// The "last sensor" title does not name the series.
		expect(labels.lastSensorTitle!('Temp')).toBe(m.cwui_chart_last_sensor());
		expect(labels.hideSeries!('Temp')).toBe(m.cwui_chart_hide_series({ label: 'Temp' }));
		expect(labels.showSeries!('Temp')).toBe(m.cwui_chart_show_series({ label: 'Temp' }));
	});
});

describe('chart labels', () => {
	it('translates the donut chart', () => {
		const labels = cwDonutChartLabels();

		expect(labels).toEqual({
			ariaLabel: m.cwui_donut_aria(),
			total: m.cwui_donut_total(),
			ofTotal: fn,
			segmentLabel: fn,
			loading: m.cwui_chart_loading_short()
		});
		expect(labels.ofTotal!(12)).toBe(m.cwui_donut_of_total({ total: 12 }));
		expect(labels.segmentLabel!('Online', 9)).toBe(
			m.cwui_donut_segment({ label: 'Online', value: 9 })
		);
	});

	it('translates the stacked bar chart', () => {
		const labels = cwStackedBarChartLabels();

		expect(labels).toEqual({
			ariaLabel: m.cwui_stacked_bar_aria(),
			total: m.cwui_stacked_bar_total(),
			barLabel: fn,
			loading: m.cwui_chart_loading_short()
		});
		expect(labels.barLabel!('Mon', '42')).toBe(
			m.cwui_stacked_bar_bar({ label: 'Mon', total: '42' })
		);
	});

	it('translates the heatmap', () => {
		const labels = cwHeatmapLabels();

		expect(labels).toEqual({
			title: m.cwui_heatmap_title(),
			noData: m.cwui_heatmap_no_data(),
			loading: m.cwui_heatmap_loading(),
			summary: fn
		});
		expect(labels.summary!({ title: 'Temp', days: 7, min: '1', max: '9' })).toBe(
			m.cwui_heatmap_summary({ title: 'Temp', days: 7, min: '1', max: '9' })
		);
	});

	it('translates the PPFD chart', () => {
		const labels = cwPpfdChartLabels();

		expect(labels).toEqual({
			eyebrow: m.cwui_ppfd_eyebrow(),
			heading: m.cwui_ppfd_heading(),
			headingWithPlant: fn,
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
			deltaBelow: fn,
			deltaAbove: fn,
			updated: fn,
			low: m.cwui_ppfd_low(),
			optimalZone: m.cwui_ppfd_optimal_zone(),
			high: m.cwui_ppfd_high(),
			loading: m.cwui_ppfd_loading()
		});
		expect(labels.headingWithPlant!('Basil')).toBe(m.cwui_ppfd_heading_plant({ plant: 'Basil' }));
		expect(labels.deltaBelow!('12', 'µmol')).toBe(
			m.cwui_ppfd_delta_below({ amount: '12', unit: 'µmol' })
		);
		expect(labels.deltaAbove!('8', 'µmol')).toBe(
			m.cwui_ppfd_delta_above({ amount: '8', unit: 'µmol' })
		);
		expect(labels.updated!('10:00')).toBe(m.cwui_ppfd_updated({ when: '10:00' }));
	});

	it('translates the DLI card', () => {
		const labels = cwDliCardLabels();

		expect(labels).toEqual({
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
			historyCount: fn,
			targetForCrop: fn,
			target: fn,
			valueAriaLabel: fn,
			barAriaLabel: fn
		});
		expect(labels.historyCount!(7)).toBe(m.cwui_dli_history_count({ days: 7 }));
		expect(labels.targetForCrop!('Basil', '12–17')).toBe(
			m.cwui_dli_target_crop({ crop: 'Basil', range: '12–17' })
		);
		expect(labels.target!('12–17')).toBe(m.cwui_dli_target({ range: '12–17' }));
		expect(labels.valueAriaLabel!('14', 'mol', 'Target 12–17', 'Good')).toBe(
			m.cwui_dli_value_aria({ value: '14', unit: 'mol', target: 'Target 12–17', status: 'Good' })
		);
		expect(labels.barAriaLabel!('40', '14', 'mol', '12–17', 'Good')).toBe(
			m.cwui_dli_bar_aria({
				scaleMax: '40',
				value: '14',
				unit: 'mol',
				range: '12–17',
				status: 'Good'
			})
		);
	});
});

describe('cwVpdChartLabels', () => {
	it('translates the VPD chart and its zones', () => {
		expect(cwVpdChartLabels()).toEqual({
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
			cellAriaLabel: fn,
			roomVpd: fn,
			target: m.cwui_vpd_target(),
			onTarget: m.cwui_vpd_on_target(),
			offTarget: m.cwui_vpd_off_target(),
			inTargetBand: m.cwui_vpd_in_target_band(),
			now: m.cwui_vpd_now(),
			loading: m.cwui_vpd_loading()
		});
	});

	it('describes a matrix cell, adding the target and current-cell notes when they apply', () => {
		const { cellAriaLabel } = cwVpdChartLabels();
		const cell = { temperatureC: 24, humidity: 60, vpd: '1.2', unit: 'kPa', zoneLabel: 'Optimal' };
		const base = m.cwui_vpd_cell({ t: 24, h: 60, vpd: '1.2', unit: 'kPa', zone: 'Optimal' });

		expect(cellAriaLabel!({ ...cell, inTarget: false, isCurrent: false })).toBe(base);
		expect(cellAriaLabel!({ ...cell, inTarget: true, isCurrent: false })).toBe(
			base + m.cwui_vpd_cell_in_target()
		);
		expect(cellAriaLabel!({ ...cell, inTarget: false, isCurrent: true })).toBe(
			base + m.cwui_vpd_cell_current()
		);
		expect(cellAriaLabel!({ ...cell, inTarget: true, isCurrent: true })).toBe(
			base + m.cwui_vpd_cell_in_target() + m.cwui_vpd_cell_current()
		);
	});

	it('fills the room VPD caption', () => {
		expect(cwVpdChartLabels().roomVpd!('24°C', '60%')).toBe(
			m.cwui_vpd_room({ temperature: '24°C', humidity: '60%' })
		);
	});
});

describe('cwWindCompassLabels', () => {
	it('translates the wind compass strings', () => {
		expect(cwWindCompassLabels()).toEqual({
			eyebrow: m.cwui_wind_eyebrow(),
			headingFallback: m.cwui_wind_heading_fallback(),
			heading: fn,
			beaufortPill: fn,
			readingLabel: fn,
			updatedLabel: fn,
			conventionFrom: m.cwui_wind_from(),
			conventionTo: m.cwui_wind_to(),
			statDirection: m.cwui_wind_stat_direction(),
			statHeading: fn,
			statSpeed: m.cwui_wind_stat_speed(),
			statBeaufort: m.cwui_wind_stat_beaufort(),
			statBeaufortValue: fn,
			statConditions: m.cwui_wind_stat_conditions(),
			cardinals: m.cwui_wind_cardinals().split(','),
			cardinalLetters: expect.any(Object),
			beaufortNames: m.cwui_wind_beaufort_names().split(','),
			srWind: fn,
			srSpeed: fn,
			srBeaufort: fn,
			loading: m.cwui_wind_loading()
		});
	});

	it('splits the comma lists into the 16 points, the 4 letters and the 13 Beaufort names', () => {
		const labels = cwWindCompassLabels();
		const [n, e, s, w] = m.cwui_wind_cardinal_letters().split(',');

		expect(labels.cardinals).toHaveLength(16);
		expect(labels.cardinalLetters).toEqual({ n, e, s, w });
		expect(labels.beaufortNames).toHaveLength(13);
	});

	it('fills the templated strings with the values the compass passes', () => {
		const labels = cwWindCompassLabels();

		expect(labels.heading!('Field 1')).toBe(m.cwui_wind_heading({ location: 'Field 1' }));
		expect(labels.beaufortPill!(3, 'Gentle')).toBe(m.cwui_wind_pill({ force: 3, label: 'Gentle' }));
		expect(labels.readingLabel!('from')).toBe(m.cwui_wind_reading({ word: 'from' }));
		expect(labels.updatedLabel!('10:00')).toBe(m.cwui_wind_updated({ formatted: '10:00' }));
		expect(labels.statHeading!('to')).toBe(m.cwui_wind_stat_heading({ word: 'to' }));
		expect(labels.statBeaufortValue!(3, 'Gentle')).toBe(
			m.cwui_wind_stat_beaufort_value({ force: 3, label: 'Gentle' })
		);
		expect(labels.srWind!('from', '270°', 'W')).toBe(
			m.cwui_wind_sr_wind({ word: 'from', direction: '270°', cardinal: 'W' })
		);
		expect(labels.srSpeed!('4 m/s')).toBe(m.cwui_wind_sr_speed({ speed: '4 m/s' }));
		expect(labels.srBeaufort!(3, 'Gentle')).toBe(
			m.cwui_wind_sr_beaufort({ force: 3, label: 'Gentle' })
		);
	});
});

describe('static label sets', () => {
	it('translates the offline overlay', () => {
		expect(cwOfflineOverlayLabels()).toEqual({
			title: m.cwui_offline_title(),
			message: m.cwui_offline_message(),
			retryLabel: m.cwui_offline_retry(),
			footnote: m.cwui_offline_footnote(),
			helpTitle: m.cwui_offline_help_title(),
			helpItemWifi: m.cwui_offline_help_wifi(),
			helpItemRouter: m.cwui_offline_help_router(),
			helpItemMobileData: m.cwui_offline_help_mobile(),
			reconnectedTitle: m.cwui_offline_reconnected_title(),
			reconnectedSubtitle: m.cwui_offline_reconnected_subtitle(),
			stillOffline: m.cwui_offline_still_offline()
		});
	});

	it('translates the calendar scroll and fills its row labels', () => {
		const labels = cwCalendarScrollLabels();

		expect(labels).toEqual({
			ariaLabel: m.cwui_cal_aria(),
			today: m.cwui_cal_today(),
			dataAvailable: m.cwui_cal_data_available(),
			noData: m.cwui_cal_no_data(),
			rowAriaLabel: fn,
			actionsAriaLabel: fn,
			contentPlaceholder: m.cwui_cal_content_placeholder(),
			noDataForDate: m.cwui_cal_no_data_for_date(),
			emptyTitle: m.cwui_cal_empty_title(),
			emptyCopy: m.cwui_cal_empty_copy()
		});
		expect(labels.rowAriaLabel!('2026-10-22', 'ok')).toBe(
			m.cwui_cal_row_aria({ key: '2026-10-22', status: 'ok' })
		);
		expect(labels.actionsAriaLabel!('2026-10-22')).toBe(
			m.cwui_cal_actions_aria({ key: '2026-10-22' })
		);
	});

	it('translates the date-time range picker', () => {
		expect(cwDateTimeRangePickerLabels()).toEqual({
			placeholder: m.cwui_dtr_placeholder(),
			dialog: m.cwui_dtr_dialog(),
			previous: m.cwui_dtr_previous(),
			next: m.cwui_dtr_next(),
			time: m.cwui_dtr_time(),
			startTime: m.cwui_dtr_start_time(),
			endTime: m.cwui_dtr_end_time(),
			cancel: m.cwui_dtr_cancel(),
			set: m.cwui_dtr_set(),
			hours: m.cwui_dtr_hours(),
			minutes: m.cwui_dtr_minutes()
		});
	});

	it('translates the stat card with the shared stat words', () => {
		expect(cwStatCardLabels()).toEqual({
			min: m.stat_min(),
			avg: m.stat_avg(),
			max: m.stat_max(),
			count: m.stat_count(),
			median: m.stat_median(),
			stdDev: m.stat_stdDev(),
			range: m.stat_range(),
			aboveAvg: m.stat_aboveAvg(),
			belowAvg: m.stat_belowAvg(),
			atAvg: m.stat_atAvg(),
			showDetails: m.common_show_details(),
			hideDetails: m.common_hide_details()
		});
	});

	it('translates the copy button', () => {
		expect(cwCopyLabels()).toEqual({
			copy: m.cwui_copy_copy(),
			copied: m.cwui_copy_copied(),
			copiedFeedback: m.cwui_copy_feedback(),
			failedFeedback: m.cwui_copy_failed()
		});
	});

	it('translates the sensor card, keeping the CWUI empty value', () => {
		expect(cwSensorCardLabels()).toEqual({
			error: m.cwui_sensor_error(),
			details: m.common_details(),
			noDetails: m.cwui_sensor_no_details(),
			noValue: CW_EMPTY_VALUE,
			lastSeen: m.cwui_sensor_last_seen(),
			ago: m.cwui_sensor_ago()
		});
	});

	it('names the location in the location card link', () => {
		expect(cwLocationCardLabels('Greenhouse A')).toEqual({
			online: m.status_online(),
			offline: m.status_offline(),
			warning: m.status_warning(),
			loading: m.status_loading(),
			viewLocation: m.cwui_location_view({ name: 'Greenhouse A' })
		});
	});

	it('translates the input, dropdown and search input', () => {
		expect(cwInputLabels()).toEqual({
			clear: m.cwui_input_clear(),
			showPassword: m.cwui_input_show_password(),
			hidePassword: m.cwui_input_hide_password(),
			increase: m.cwui_input_increase(),
			decrease: m.cwui_input_decrease()
		});
		expect(cwDropdownLabels()).toEqual({ empty: m.cwui_select_empty() });
		expect(cwSearchInputLabels()).toEqual({
			noResults: m.cwui_search_no_results(),
			error: m.cwui_search_error(),
			clear: m.cwui_input_clear()
		});
	});

	it('leaves the placeholders in the multi-select templates for CWUI to fill', () => {
		const labels = cwMultiSelectLabels();

		expect(labels).toEqual({
			remove: m.cwui_multi_remove({ label: '{label}' }),
			more: m.cwui_multi_more({ count: '{count}' }),
			selectAllInGroup: m.cwui_multi_select_all_group({ group: '{group}' }),
			clearAllInGroup: m.cwui_multi_clear_all_group({ group: '{group}' }),
			empty: m.cwui_select_empty()
		});
		expect(labels.remove).toContain('{label}');
		expect(labels.more).toContain('{count}');
		expect(labels.selectAllInGroup).toContain('{group}');
		expect(labels.clearAllInGroup).toContain('{group}');
	});

	it('translates the theme picker, side nav and calendar', () => {
		expect(cwThemePickerLabels()).toEqual({
			trigger: m.cwui_theme_trigger(),
			menu: m.cwui_theme_menu(),
			light: m.cwui_theme_light(),
			dark: m.cwui_theme_dark(),
			system: m.cwui_theme_system()
		});
		expect(cwSideNavLabels()).toEqual({
			close: m.cwui_sidenav_close(),
			collapse: m.cwui_sidenav_collapse(),
			expand: m.cwui_sidenav_expand()
		});
		expect(cwCalendarLabels()).toEqual({
			previousMonth: m.cwui_cal_previous_month(),
			nextMonth: m.cwui_cal_next_month()
		});
	});
});
