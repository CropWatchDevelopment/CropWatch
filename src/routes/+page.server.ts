import { DateTime } from 'luxon';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, session } }) => {
	if (!session) {
		return {
			totalDeviceCount: 0,
			activeDeviceCount: 0,
			idleDeviceCount: 0,
			inactiveDeviceCount: 0,
			totalAlerts: 0,
			activeAlerts: 0,
			recentAlerts: [],
			lowBatteryDevices: [],
			reports: [],
			error: null
		};
	}

	// Check if there are any devices in the database
	const { data: devices, error } = await supabase
		.from('cw_devices')
		.select(
			`
			*,
			cw_device_owners(user_id),
			cw_rules(*),
			reports(*, report_user_schedule(*)),
			cw_locations(*)
		`
		)
		.eq('cw_device_owners.user_id', session.user.id);

	const totalDeviceCount = devices?.length || 0;
	const activeDeviceCount =
		devices?.filter(
			(dev) =>
				dev.last_data_updated_at &&
				DateTime.now().toUTC().diff(DateTime.fromISO(dev.last_data_updated_at).toUTC(), 'minutes')
					.minutes <= dev.upload_interval
		).length || 0;
	// Idle Devices are devices that haven't been seen for more than their upload interval, but less than three times their upload interval
	const idleDeviceCount =
		devices?.filter(
			(dev) =>
				dev.last_data_updated_at &&
				DateTime.now().toUTC().diff(DateTime.fromISO(dev.last_data_updated_at).toUTC(), 'minutes')
					.minutes > dev.upload_interval &&
				DateTime.now().toUTC().diff(DateTime.fromISO(dev.last_data_updated_at).toUTC(), 'minutes')
					.minutes <=
					dev.upload_interval * 3
		).length || 0;
	const inactiveDeviceCount =
		devices?.filter(
			(dev) =>
				!(
					dev.last_data_updated_at &&
					DateTime.now().toUTC().diff(DateTime.fromISO(dev.last_data_updated_at).toUTC(), 'minutes')
						.minutes <= dev.upload_interval
				)
		).length || 0;
	const alertsTriggered =
		devices?.filter((dev) => dev.cw_rules && dev.cw_rules.is_triggered).length || 0;
	const alertsNotTriggered =
		devices?.filter((dev) => dev.cw_rules && !dev.cw_rules.is_triggered).length || 0;
	const totalAlerts =
		devices?.reduce((acc, dev) => acc + (dev.cw_rules ? dev.cw_rules.length : 0), 0) || 0;
	const totalTriggerCount = devices
		?.flatMap((d) => d.cw_rules ?? [])
		.reduce((sum, r) => sum + (r.trigger_count ?? 0), 0);

	// recently triggered alerts
	const recentAlerts =
		devices
			?.map((dev) =>
				dev.cw_rules
					? dev.cw_rules
							.filter((rule) => rule.is_triggered)
							.map((rule) => ({
								device_name: dev.name,
								dev_eui: rule.dev_eui,
								severity: rule.severity,
								time: rule.last_triggered
									? DateTime.fromISO(rule.last_triggered).toRelative()
									: 'Unknown'
							}))
					: []
			)
			.flat() || [];
	// get reports that will be generated within the next week
	const reports = devices?.map((dev) => (dev.reports ? dev.reports : [])).flat() || [];

	// Battery levels ordered from smallest to largest nor including nulls
	// format { name: string, battery_level: number | null }
	const lowBatteryDevices =
		devices
			?.filter((dev) => dev.battery_level !== null)
			.sort((a, b) => a.battery_level! - b.battery_level!)
			.slice(0, 5)
			.map((dev) => ({
				name: dev.name,
				battery_level: dev.battery_level
			})) || [];

	return {
		totalDeviceCount,
		activeDeviceCount,
		idleDeviceCount,
		inactiveDeviceCount,
		totalAlerts,
		alertsTriggered,
		recentAlerts,
		lowBatteryDevices,
		totalTriggerCount,
		reports,
		error
	};
};
