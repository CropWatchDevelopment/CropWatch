import { getIntlLocale } from '#lib/i18n/format.ts';
import { m } from '#lib/paraglide/messages.js';
import type { RuleScheduleInput } from '#lib/rules/rule-template.types.ts';

/**
 * The "Data Field" value that makes a rule a Date/Time rule. It never reaches
 * the API as a condition: a Date/Time rule has a schedule instead.
 */
export const DATE_TIME_SUBJECT = '__date_time__';

/** ISO weekdays, Monday first. */
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function weekdayLabel(day: number): string {
	switch (day) {
		case 1:
			return m.common_day_monday();
		case 2:
			return m.common_day_tuesday();
		case 3:
			return m.common_day_wednesday();
		case 4:
			return m.common_day_thursday();
		case 5:
			return m.common_day_friday();
		case 6:
			return m.common_day_saturday();
		default:
			return m.common_day_sunday();
	}
}

/** Mon, Tue, ... in the reader's language. 2024-01-01 was a Monday. */
function shortWeekday(day: number): string {
	return new Intl.DateTimeFormat(getIntlLocale(), { weekday: 'short', timeZone: 'UTC' }).format(
		new Date(Date.UTC(2024, 0, day))
	);
}

/** "Mon, Wed, Fri at 09:00 (Asia/Tokyo)", or "Every day at ..." for all seven. */
export function describeSchedule(schedule: RuleScheduleInput): string {
	const days = [...new Set(schedule.daysOfWeek)].sort((a, b) => a - b);
	return m.rules_dt_summary({
		days: days.length === 7 ? m.rules_dt_every_day() : days.map(shortWeekday).join(', '),
		time: schedule.timeOfDay,
		zone: schedule.timezone
	});
}

/** "09:05" from hours and minutes. */
export function formatTimeOfDay(time: { hours: number; minutes: number }): string {
	return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
}

/** Hours and minutes of "09:05" (or of a database "09:05:00"); 09:00 when it cannot be read. */
export function parseTimeOfDay(value: string | null | undefined): {
	hours: number;
	minutes: number;
} {
	const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
	const hours = match ? Number(match[1]) : NaN;
	const minutes = match ? Number(match[2]) : NaN;
	return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
		? { hours, minutes }
		: { hours: 9, minutes: 0 };
}
