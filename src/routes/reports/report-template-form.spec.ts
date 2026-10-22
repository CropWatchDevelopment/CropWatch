import { describe, expect, it } from 'vitest';
import type { CwAlertPointRule, CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
import type {
	ReportTemplateAlertPointDto,
	ReportTemplateDataProcessingScheduleDto,
	ReportTemplateDto,
	ReportTemplateRecipientDto,
	ReportTemplateScheduleDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import {
	buildSaveRequest,
	buildValidationIssues,
	cleanOptional,
	createEmptyAlertPointsValue,
	createReportTemplateDraftFactory,
	parseOptionalInteger,
	parseOptionalNumber,
	type ReportTemplateDraft
} from './report-template-form';

/** The key generator the form uses: `<prefix>-<n>`, counting up. */
function sequentialKeys() {
	let sequence = 0;
	return (prefix: string) => `${prefix}-${++sequence}`;
}

const factory = () => createReportTemplateDraftFactory(sequentialKeys());

function schedule(overrides: Partial<ReportTemplateScheduleDto> = {}): ReportTemplateScheduleDto {
	return {
		id: 1,
		templateId: 9,
		endOfDay: true,
		endOfWeek: false,
		endOfMonth: true,
		utcOffset: 9,
		isActive: false,
		createdAt: null,
		...overrides
	};
}

function recipient(
	overrides: Partial<ReportTemplateRecipientDto> = {}
): ReportTemplateRecipientDto {
	return {
		id: 1,
		templateId: 9,
		communicationMethod: 2,
		email: 'ops@example.com',
		name: 'Ops',
		createdAt: null,
		...overrides
	};
}

function alertPoint(
	overrides: Partial<ReportTemplateAlertPointDto> = {}
): ReportTemplateAlertPointDto {
	return {
		id: 41,
		templateId: 9,
		name: 'Too warm',
		dataPointKey: 'temperature_c',
		operator: '>',
		min: null,
		max: null,
		value: 8,
		hexColor: '#ff0000',
		createdAt: null,
		...overrides
	};
}

function processingSchedule(
	overrides: Partial<ReportTemplateDataProcessingScheduleDto> = {}
): ReportTemplateDataProcessingScheduleDto {
	return {
		id: 'dps-uuid',
		templateId: 9,
		dayOfWeek: 3,
		startTime: '08:00',
		endTime: '18:00',
		crossesMidnight: true,
		ruleType: 'exclude',
		validFrom: null,
		validTo: null,
		timezone: 'Asia/Tokyo',
		isEnabled: false,
		createdAt: null,
		updatedAt: null,
		...overrides
	};
}

function template(overrides: Partial<ReportTemplateDto> = {}): ReportTemplateDto {
	return {
		id: 9,
		name: 'Weekly cold room',
		description: 'Every Monday',
		deviceTypeId: 4,
		dataPullInterval: 60,
		isActive: false,
		createdAt: null,
		assignments: [],
		schedule: [schedule()],
		recipients: [recipient()],
		alertPoints: [alertPoint()],
		dataProcessingSchedules: [processingSchedule()],
		...overrides
	};
}

function point(overrides: Partial<CwAlertPointRule> = {}): CwAlertPointRule {
	return {
		id: 'p-1',
		name: 'Too warm',
		color: '',
		condition: 'greaterThan',
		value: '8',
		min: '',
		max: '',
		...overrides
	};
}

const alertPoints = (...points: CwAlertPointRule[]): CwAlertPointsValue => ({
	...createEmptyAlertPointsValue(),
	points
});

/** A complete, valid draft: a name, the default cadence and one emailed recipient. */
function validDraft(overrides: Partial<ReportTemplateDraft> = {}): ReportTemplateDraft {
	return {
		...factory().buildDefaultDraft('ops@example.com', 'Ops'),
		name: 'Weekly cold room',
		...overrides
	};
}

describe('cleanOptional', () => {
	it('trims a value, and has none for blank text', () => {
		expect(cleanOptional('  ops  ')).toBe('ops');
		expect(cleanOptional('   ')).toBeUndefined();
		expect(cleanOptional('')).toBeUndefined();
	});
});

describe('parseOptionalInteger', () => {
	it.each([
		['42', 42],
		[' 7 ', 7],
		['-2', -2],
		['3.9', 3],
		['12abc', 12]
	])('reads %j as %j', (value, parsed) => {
		expect(parseOptionalInteger(value)).toBe(parsed);
	});

	it.each(['', '  ', 'abc'])('has no integer for %j', (value) => {
		expect(parseOptionalInteger(value)).toBeUndefined();
	});
});

describe('parseOptionalNumber', () => {
	it.each([
		['3.5', 3.5],
		[' -2 ', -2],
		['1e3', 1000],
		['0', 0]
	])('reads %j as %j', (value, parsed) => {
		expect(parseOptionalNumber(value)).toBe(parsed);
	});

	it.each(['', '  ', 'abc', '12abc', 'Infinity'])('has no number for %j', (value) => {
		expect(parseOptionalNumber(value)).toBeUndefined();
	});
});

describe('createEmptyAlertPointsValue', () => {
	it('starts in Celsius around zero, without points, as a fresh value each time', () => {
		const value = createEmptyAlertPointsValue();

		expect(value).toEqual({ unit: 'C', center: '0', points: [] });
		expect(createEmptyAlertPointsValue()).not.toBe(value);
	});
});

describe('createReportTemplateDraftFactory — new rows', () => {
	it('creates a blank recipient by email, optionally prefilled', () => {
		const drafts = factory();

		expect(drafts.createEmptyRecipient()).toEqual({
			communication_method: '1',
			email: '',
			name: '',
			key: 'recipient-1'
		});
		expect(drafts.createEmptyRecipient('ada@example.com', 'Ada')).toEqual({
			communication_method: '1',
			email: 'ada@example.com',
			name: 'Ada',
			key: 'recipient-2'
		});
	});

	it('creates a Monday office-hours processing schedule', () => {
		expect(factory().createEmptyDataProcessingSchedule()).toEqual({
			crosses_midnight: false,
			day_of_week: '1',
			end_time: '17:00',
			is_enabled: true,
			key: 'dps-1',
			rule_type: 'include',
			start_time: '09:00',
			timezone: 'UTC'
		});
	});

	it('starts a new template active, weekly, every 30 minutes, sent to the current user', () => {
		expect(factory().buildDefaultDraft('ada@example.com', 'Ada')).toEqual({
			name: '',
			description: '',
			data_pull_interval: '30',
			is_active: true,
			cadence: {
				end_of_day: false,
				end_of_week: true,
				end_of_month: false,
				utc_offset: '0',
				is_active: true,
				key: 'cadence-1'
			},
			recipients: [
				{ communication_method: '1', email: 'ada@example.com', name: 'Ada', key: 'recipient-2' }
			],
			data_processing_schedules: []
		});
	});

	it('starts with a blank recipient without a current user', () => {
		expect(factory().buildDefaultDraft().recipients).toEqual([
			{ communication_method: '1', email: '', name: '', key: 'recipient-2' }
		]);
	});
});

describe('createReportTemplateDraftFactory — an existing template', () => {
	it('loads every section of the template into the draft', () => {
		expect(factory().buildDraftFromTemplate(template())).toEqual({
			name: 'Weekly cold room',
			description: 'Every Monday',
			data_pull_interval: '60',
			is_active: false,
			cadence: {
				end_of_day: true,
				end_of_week: false,
				end_of_month: true,
				utc_offset: '9',
				// Pausing is done on the template, so the schedule always loads active.
				is_active: true,
				key: 'cadence-1'
			},
			recipients: [
				{ communication_method: '2', email: 'ops@example.com', name: 'Ops', key: 'recipient-2' }
			],
			data_processing_schedules: [
				{
					crosses_midnight: true,
					day_of_week: '3',
					end_time: '18:00',
					is_enabled: false,
					key: 'dps-3',
					rule_type: 'exclude',
					start_time: '08:00',
					timezone: 'Asia/Tokyo'
				}
			]
		});
	});

	it('fills in defaults for the missing parts of a template', () => {
		const sparse = template({
			name: null as never,
			description: null,
			dataPullInterval: 0,
			isActive: null as never,
			schedule: [],
			recipients: [],
			dataProcessingSchedules: [
				processingSchedule({
					crossesMidnight: null as never,
					dayOfWeek: null as never,
					endTime: null as never,
					isEnabled: null as never,
					ruleType: null as never,
					startTime: null as never,
					timezone: null as never
				})
			]
		});

		expect(factory().buildDraftFromTemplate(sparse)).toEqual({
			name: '',
			description: '',
			data_pull_interval: '30',
			is_active: true,
			cadence: {
				end_of_day: false,
				end_of_week: true,
				end_of_month: false,
				utc_offset: '0',
				is_active: true,
				key: 'cadence-1'
			},
			recipients: [{ communication_method: '1', email: '', name: '', key: 'recipient-2' }],
			data_processing_schedules: [
				{
					crosses_midnight: false,
					day_of_week: '1',
					end_time: '17:00',
					is_enabled: true,
					key: 'dps-3',
					rule_type: 'include',
					start_time: '09:00',
					timezone: 'UTC'
				}
			]
		});
	});

	it('fills in defaults for a sparse schedule and recipient', () => {
		const draft = factory().buildDraftFromTemplate(
			template({
				schedule: [schedule({ utcOffset: null as never })],
				recipients: [recipient({ communicationMethod: null as never, email: null, name: null })]
			})
		);

		expect(draft.cadence.utc_offset).toBe('0');
		expect(draft.recipients).toEqual([
			{ communication_method: '1', email: '', name: '', key: 'recipient-2' }
		]);
	});

	it('uses only the first schedule for the cadence', () => {
		const draft = factory().buildDraftFromTemplate(
			template({ schedule: [schedule({ utcOffset: -5 }), schedule({ utcOffset: 3 })] })
		);

		expect(draft.cadence.utc_offset).toBe('-5');
	});

	it.each([
		['>', 'greaterThan'],
		['>=', 'greaterThanOrEqual'],
		['<', 'lessThan'],
		['<=', 'lessThanOrEqual'],
		['range', 'range'],
		['=', 'equals'],
		['!=', 'equals']
	])('reads the operator "%s" as the condition %s', (operator, condition) => {
		const value = factory().buildAlertPointsValueFromTemplate(
			template({ alertPoints: [alertPoint({ operator })] })
		);

		expect(value.points[0].condition).toBe(condition);
	});

	it.each([
		['bounds', { min: 2, max: null }, 'range'],
		['an upper bound', { min: null, max: 9 }, 'range'],
		['no bounds', { min: null, max: null }, 'equals']
	])('without an operator, reads a point with %s as %s', (_label, bounds, condition) => {
		for (const operator of [null, '  ']) {
			const value = factory().buildAlertPointsValueFromTemplate(
				template({ alertPoints: [alertPoint({ operator, ...bounds })] })
			);
			expect(value.points[0].condition).toBe(condition);
		}
	});

	it('loads the alert points as editor values', () => {
		const value = factory().buildAlertPointsValueFromTemplate(
			template({
				alertPoints: [
					alertPoint({ id: 41, hexColor: ' #ff00aa ', value: 8, min: null, max: null }),
					alertPoint({
						id: null as never,
						name: null as never,
						operator: 'range',
						hexColor: null,
						value: null,
						min: -1.5,
						max: 0
					})
				]
			})
		);

		expect(value).toEqual({
			unit: 'C',
			center: '0',
			points: [
				{
					color: '#FF00AA',
					condition: 'greaterThan',
					id: '41',
					max: '',
					min: '',
					name: 'Too warm',
					value: '8'
				},
				{
					color: '',
					condition: 'range',
					// A point without an id gets a local key, numbered by position.
					id: 'alert-2-1',
					max: '0',
					min: '-1.5',
					name: '',
					value: ''
				}
			]
		});
	});

	it('has no alert points for a template without any', () => {
		expect(factory().buildAlertPointsValueFromTemplate(template({ alertPoints: [] }))).toEqual(
			createEmptyAlertPointsValue()
		);
	});
});

describe('buildSaveRequest', () => {
	it('sends the draft as the API payload', () => {
		const draft = factory().buildDraftFromTemplate(template());
		draft.name = '  Weekly cold room ';
		draft.description = '  Every Monday  ';

		expect(
			buildSaveRequest(
				draft,
				['DEV-1', 'DEV-2'],
				alertPoints(
					point({ name: ' Too warm ', color: ' #ff0000 ', value: '8' }),
					point({ id: 'p-2', name: 'Band', condition: 'range', value: '', min: '1', max: '5' })
				),
				4
			)
		).toEqual({
			name: 'Weekly cold room',
			description: 'Every Monday',
			isActive: false,
			deviceTypeId: 4,
			devEuis: ['DEV-1', 'DEV-2'],
			schedule: [
				{ endOfDay: true, endOfWeek: false, endOfMonth: true, utcOffset: 9, isActive: true }
			],
			recipients: [{ communicationMethod: 2, email: 'ops@example.com', name: 'Ops' }],
			alertPoints: [
				{
					dataPointKey: 'temperature_c',
					name: 'Too warm',
					hexColor: '#FF0000',
					operator: '>',
					value: 8
				},
				{ dataPointKey: 'temperature_c', name: 'Band', max: 5, min: 1, operator: 'range' }
			],
			dataProcessingSchedules: [
				{
					dayOfWeek: 3,
					startTime: '08:00',
					endTime: '18:00',
					crossesMidnight: true,
					isEnabled: false,
					ruleType: 'exclude',
					timezone: 'Asia/Tokyo'
				}
			],
			dataPullInterval: 60
		});
	});

	it('leaves out what the draft does not have', () => {
		const draft = validDraft({
			description: '   ',
			data_pull_interval: '',
			recipients: [{ communication_method: 'x', email: '  ', name: '', key: 'r' }],
			data_processing_schedules: [
				{
					crosses_midnight: false,
					day_of_week: '0',
					end_time: '17:00',
					is_enabled: true,
					key: 'd',
					rule_type: '',
					start_time: '09:00',
					timezone: ''
				}
			]
		});
		draft.cadence.utc_offset = 'abc';

		const payload = buildSaveRequest(draft, [], alertPoints(), null);

		expect(payload).toEqual({
			name: 'Weekly cold room',
			description: null,
			isActive: true,
			deviceTypeId: null,
			devEuis: [],
			schedule: [
				{ endOfDay: false, endOfWeek: true, endOfMonth: false, utcOffset: 0, isActive: true }
			],
			recipients: [{ communicationMethod: 1 }],
			alertPoints: [],
			dataProcessingSchedules: [
				{
					dayOfWeek: 0,
					startTime: '09:00',
					endTime: '17:00',
					crossesMidnight: false,
					isEnabled: true
				}
			]
		});
		expect(payload).not.toHaveProperty('dataPullInterval');
	});

	it('skips processing schedules without a day, start or end', () => {
		const complete = factory().createEmptyDataProcessingSchedule();
		const draft = validDraft({
			data_processing_schedules: [
				{ ...complete, day_of_week: '' },
				{ ...complete, start_time: '' },
				{ ...complete, end_time: '' },
				complete
			]
		});

		expect(buildSaveRequest(draft, ['DEV-1'], alertPoints(), null).dataProcessingSchedules).toEqual(
			[
				{
					dayOfWeek: 1,
					startTime: '09:00',
					endTime: '17:00',
					crossesMidnight: false,
					isEnabled: true,
					ruleType: 'include',
					timezone: 'UTC'
				}
			]
		);
	});

	it.each([
		['greaterThan', '>'],
		['greaterThanOrEqual', '>='],
		['lessThan', '<'],
		['lessThanOrEqual', '<='],
		['range', 'range'],
		['equals', '='],
		['somethingElse', '=']
	])('sends the condition %s as the operator "%s"', (condition, operator) => {
		const [sent] = buildSaveRequest(
			validDraft(),
			['DEV-1'],
			alertPoints(point({ condition: condition as CwAlertPointRule['condition'] })),
			null
		).alertPoints!;

		expect(sent.operator).toBe(operator);
	});

	it('sends only the numbers an alert point has', () => {
		const [sent] = buildSaveRequest(
			validDraft(),
			['DEV-1'],
			alertPoints(point({ value: 'abc', min: ' ', max: '' })),
			null
		).alertPoints!;

		expect(sent).toEqual({ dataPointKey: 'temperature_c', name: 'Too warm', operator: '>' });
	});

	it('keeps a zero threshold', () => {
		const [sent] = buildSaveRequest(
			validDraft(),
			['DEV-1'],
			alertPoints(point({ value: '0', min: '0', max: '0' })),
			null
		).alertPoints!;

		expect(sent).toMatchObject({ value: 0, min: 0, max: 0 });
	});
});

describe('buildValidationIssues', () => {
	it('has nothing to report for a complete draft', () => {
		expect(buildValidationIssues(validDraft(), ['DEV-1'], alertPoints(point()))).toEqual([]);
	});

	it('asks for a name, a device and a cadence, in that order', () => {
		const draft = validDraft({ name: '   ' });
		draft.cadence.end_of_week = false;

		expect(buildValidationIssues(draft, [], alertPoints())).toEqual([
			m.reports_create_validation_report_name_required(),
			m.reports_new_validation_devices_required(),
			m.reports_new_validation_cadence_required()
		]);
	});

	it.each([
		['the end of each day', { end_of_day: true }],
		['the end of each month', { end_of_month: true }]
	])('accepts a cadence of %s', (_label, cadence) => {
		const draft = validDraft();
		Object.assign(draft.cadence, { end_of_week: false, ...cadence });

		expect(buildValidationIssues(draft, ['DEV-1'], alertPoints())).toEqual([]);
	});

	it('needs no cadence while the schedule is inactive', () => {
		const draft = validDraft();
		Object.assign(draft.cadence, { end_of_week: false, is_active: false });

		expect(buildValidationIssues(draft, ['DEV-1'], alertPoints())).toEqual([]);
	});

	it('checks each alert point, numbered from 1', () => {
		expect(
			buildValidationIssues(
				validDraft(),
				['DEV-1'],
				alertPoints(
					point({ name: ' ', value: '' }),
					point({ condition: 'range', min: '1', max: '' }),
					point({ condition: 'range', min: '9', max: '1' }),
					point({ condition: 'range', min: '1', max: '9', color: 'red' }),
					point({ color: '#12345G' }),
					point({ color: ' #A1b2C3 ' })
				)
			)
		).toEqual([
			m.reports_create_validation_alert_name({ index: '1' }),
			m.reports_create_validation_alert_value({ index: '1' }),
			m.reports_create_validation_alert_range_required({ index: '2' }),
			m.reports_create_validation_alert_range_order({ index: '3' }),
			m.reports_create_validation_alert_hex({ index: '4' }),
			m.reports_create_validation_alert_hex({ index: '5' })
		]);
	});

	it('accepts a range whose bounds are equal', () => {
		expect(
			buildValidationIssues(
				validDraft(),
				['DEV-1'],
				alertPoints(point({ condition: 'range', min: '4', max: '4' }))
			)
		).toEqual([]);
	});

	it('checks each recipient, numbered from 1', () => {
		const draft = validDraft({
			recipients: [
				{ communication_method: '', email: '', name: '', key: 'r1' },
				{ communication_method: '0', email: 'not-an-email', name: '', key: 'r2' },
				{ communication_method: '2', email: ' ada@example.com ', name: '', key: 'r3' },
				{ communication_method: '1', email: 'a b@example.com', name: '', key: 'r4' }
			]
		});

		expect(buildValidationIssues(draft, ['DEV-1'], alertPoints())).toEqual([
			m.reports_create_validation_recipient_method({ index: '1' }),
			m.reports_new_validation_recipient_email_required({ index: '1' }),
			m.reports_create_validation_recipient_method({ index: '2' }),
			m.reports_create_validation_recipient_email({ index: '2' }),
			m.reports_create_validation_recipient_email({ index: '4' })
		]);
	});

	it('lists alert point issues before recipient issues', () => {
		const draft = validDraft({
			recipients: [{ communication_method: '1', email: '', name: '', key: 'r1' }]
		});

		expect(buildValidationIssues(draft, ['DEV-1'], alertPoints(point({ value: '' })))).toEqual([
			m.reports_create_validation_alert_value({ index: '1' }),
			m.reports_new_validation_recipient_email_required({ index: '1' })
		]);
	});
});
