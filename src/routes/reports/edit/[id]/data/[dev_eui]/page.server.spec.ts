import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceDto, ReportTemplateDto } from '$lib/api/api.dtos';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

// The 23-month editing window is measured from "now"; pin it.
const NOW = new Date('2026-07-25T12:00:00Z');
const PERIOD = '?start=2026-07-12&end=2026-07-18&file=2026_07_12-2026_07_18.pdf';

function template(overrides: Partial<ReportTemplateDto> = {}): ReportTemplateDto {
	return {
		id: 5,
		name: 'Weekly cold room',
		assignments: [{ devEui: 'DEV-1', deviceName: 'Cold room sensor', canManage: true }],
		...overrides
	} as ReportTemplateDto;
}

function device(overrides: Partial<DeviceDto> = {}): DeviceDto {
	return {
		dev_eui: 'DEV-1',
		name: 'Air sensor 1',
		cw_device_type: { data_table_v2: 'cw_air_data' },
		...overrides
	} as DeviceDto;
}

const apiError = (status: number) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: null });

function run(
	locals: TestLocals,
	query = PERIOD,
	params: Record<string, string> = { id: '5', dev_eui: 'DEV-1' }
) {
	return load(
		testEvent<LoadEvent>({
			locals,
			params,
			url: `http://localhost/reports/edit/${params.id}/data/${params.dev_eui}${query}`
		})
	);
}

/** The HTTP error the load throws, as `{ status, message }`. */
async function failure(locals: TestLocals, query = PERIOD, params?: Record<string, string>) {
	let thrown: unknown = new Error('expected the load to fail');
	try {
		await run(locals, query, params);
	} catch (error) {
		thrown = error;
	}
	if (!isHttpError(thrown)) throw thrown;
	return { status: thrown.status, message: thrown.body.message };
}

/** Mock `locals` answering the template and device lookups. */
function answering(found: { template?: ReportTemplateDto; device?: DeviceDto } = {}) {
	const locals = testLocals();
	locals.services.reports.getReportTemplate.mockResolvedValue(found.template ?? template());
	locals.services.devices.getDevice.mockResolvedValue(found.device ?? device());
	return locals;
}

/** `locals` whose services are the real repositories over `fetch`, as hooks.server.ts builds them. */
function httpLocals(fetch: FetchFn): TestLocals {
	const services = createServerServices({
		fetch,
		authToken: () => TEST_JWT,
		config: testPublicConfig(),
		serverConfig: testServerConfig()
	});
	return { ...testLocals(), services } as unknown as TestLocals;
}

const invalidPeriod = { status: 400, message: m.reports_new_edit_data_invalid_period() };

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('report data edit load', () => {
	it('loads the template and the air device for the period being edited', async () => {
		const locals = answering();

		// No authToken: the page never reads it (the services send the session).
		await expect(run(locals)).resolves.toEqual({
			template: template(),
			devEui: 'DEV-1',
			deviceName: 'Cold room sensor',
			start: '2026-07-12',
			end: '2026-07-18',
			file: '2026_07_12-2026_07_18.pdf'
		});
		expect(locals.services.reports.getReportTemplate).toHaveBeenCalledWith(5);
		expect(locals.services.devices.getDevice).toHaveBeenCalledWith('DEV-1');
	});

	it('accepts a regenerated report file for the same period', async () => {
		const file = '2026_07_12-2026_07_18_updated_20260725_0130.pdf';

		await expect(
			run(answering(), `?start=2026-07-12&end=2026-07-18&file=${file}`)
		).resolves.toMatchObject({ file });
	});

	it('accepts a period of exactly 62 days', async () => {
		await expect(
			run(answering(), '?start=2026-05-01&end=2026-07-02&file=2026_05_01-2026_07_02.pdf')
		).resolves.toMatchObject({ start: '2026-05-01', end: '2026-07-02' });
	});

	it.each([
		['the device name when the assignment has none', { deviceName: null }, {}, 'Air sensor 1'],
		['the dev EUI when neither has a name', { deviceName: null }, { name: null }, 'DEV-1']
	])('names the device by %s', async (_label, assignment, deviceOverrides, deviceName) => {
		const locals = answering({
			template: template({
				assignments: [{ devEui: 'DEV-1', canManage: true, ...assignment }] as never
			}),
			device: device(deviceOverrides as Partial<DeviceDto>)
		});

		await expect(run(locals)).resolves.toMatchObject({ deviceName });
	});

	it('answers 401 without a session, before calling the API', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(failure(locals)).resolves.toEqual({
			status: 401,
			message: m.error_unauthorized_title()
		});
		expect(locals.services.reports.getReportTemplate).not.toHaveBeenCalled();
	});

	it('answers 401 when the session has no user id', async () => {
		const locals = testLocals({ jwt: null });

		await expect(failure(locals)).resolves.toEqual({
			status: 401,
			message: m.error_unauthorized_title()
		});
	});

	it.each(['abc', '0', '-3', '1.5'])('answers 400 for the template id "%s"', async (id) => {
		const locals = testLocals();

		await expect(failure(locals, PERIOD, { id, dev_eui: 'DEV-1' })).resolves.toEqual({
			status: 400,
			message: m.reports_new_invalid_template_id()
		});
		expect(locals.services.reports.getReportTemplate).not.toHaveBeenCalled();
	});

	it.each([
		['no period at all', ''],
		[
			'a start that is not a date',
			'?start=2026-7-12&end=2026-07-18&file=2026_07_12-2026_07_18.pdf'
		],
		[
			'an end that is not a date',
			'?start=2026-07-12&end=18.07.2026&file=2026_07_12-2026_07_18.pdf'
		],
		['an end before the start', '?start=2026-07-18&end=2026-07-12&file=2026_07_18-2026_07_12.pdf'],
		[
			'a date that does not exist',
			'?start=2026-07-12&end=2026-13-01&file=2026_07_12-2026_13_01.pdf'
		],
		['a period over 62 days', '?start=2026-05-01&end=2026-07-03&file=2026_05_01-2026_07_03.pdf'],
		['no file', '?start=2026-07-12&end=2026-07-18'],
		['a file that is not a report', '?start=2026-07-12&end=2026-07-18&file=weekly.pdf'],
		['a file for another period', '?start=2026-07-12&end=2026-07-18&file=2026_07_12-2026_07_19.pdf']
	])('answers 400 for %s, before calling the API', async (_label, query) => {
		const locals = testLocals();

		await expect(failure(locals, query)).resolves.toEqual(invalidPeriod);
		expect(locals.services.reports.getReportTemplate).not.toHaveBeenCalled();
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it('answers 400 for a period past the 23-month editing window', async () => {
		const locals = testLocals();

		await expect(
			failure(locals, '?start=2024-08-18&end=2024-08-24&file=2024_08_18-2024_08_24.pdf')
		).resolves.toEqual({ status: 400, message: m.reports_new_edit_data_too_old() });
		expect(locals.services.reports.getReportTemplate).not.toHaveBeenCalled();
	});

	it('answers 404 when the API does not know the template', async () => {
		const locals = testLocals();
		locals.services.reports.getReportTemplate.mockRejectedValue(apiError(404));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
		expect(consoleError).not.toHaveBeenCalled();
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it.each([
		['an API error other than 404', apiError(500)],
		['a network failure', new TypeError('Failed to fetch')],
		['a 404-shaped value that is not an API error', { status: 404 }]
	])('logs and answers 500 when the template fails with %s', async (_label, cause) => {
		const locals = testLocals();
		locals.services.reports.getReportTemplate.mockRejectedValue(cause);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 500,
			message: m.reports_new_load_failed()
		});
		expect(consoleError).toHaveBeenCalledWith('Failed to load report template:', cause);
	});

	it('answers 404 when the device is not assigned to the template', async () => {
		const locals = answering({ template: template({ assignments: [] }) });

		await expect(failure(locals)).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it.each([
		['the API says the caller may not manage the device', { canManage: false }],
		['the API does not say (an older API)', {}]
	])('answers 403 when %s, before loading the device', async (_label, access) => {
		const locals = answering({
			template: template({
				assignments: [{ devEui: 'DEV-1', deviceName: 'Cold room sensor', ...access }] as never
			})
		});

		await expect(failure(locals)).resolves.toEqual({
			status: 403,
			message: m.reports_new_edit_data_forbidden()
		});
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it('answers 404 when the API does not know the device', async () => {
		const locals = answering();
		locals.services.devices.getDevice.mockRejectedValue(apiError(404));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
		expect(consoleError).not.toHaveBeenCalled();
	});

	it.each([
		['an API error other than 404', apiError(403)],
		['a network failure', new TypeError('Failed to fetch')]
	])('logs and answers 500 when the device fails with %s', async (_label, cause) => {
		const locals = answering();
		locals.services.devices.getDevice.mockRejectedValue(cause);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 500,
			message: m.reports_new_load_failed()
		});
		expect(consoleError).toHaveBeenCalledWith('Failed to load device:', cause);
	});

	it.each([
		['another device type', device({ cw_device_type: { data_table_v2: 'cw_soil_data' } as never })],
		['no device type', device({ cw_device_type: undefined as never })]
	])('answers 400 for a device with %s: only air devices have notes', async (_label, found) => {
		await expect(failure(answering({ device: found }))).resolves.toEqual({
			status: 400,
			message: m.reports_new_edit_data_not_air()
		});
	});

	it('requests GET /reports/5 and then GET /devices/DEV-1 as the session', async () => {
		const fake = createFakeFetch((request) =>
			jsonResponse(request.path.startsWith('/reports') ? template() : device())
		);

		await expect(run(httpLocals(fake.fetch))).resolves.toMatchObject({
			template: template(),
			deviceName: 'Cold room sensor'
		});

		expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
			'GET /reports/5',
			'GET /devices/DEV-1'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});

	it('answers 404 when the API responds 404 for the template', async () => {
		const fake = createFakeFetch(() => jsonResponse({ message: 'Not found' }, { status: 404 }));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(httpLocals(fake.fetch))).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
		expect(fake.onlyRequest().path).toBe('/reports/5');
	});
});
