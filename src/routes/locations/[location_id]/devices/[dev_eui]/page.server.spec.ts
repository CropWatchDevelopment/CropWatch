import { describe, expect, it } from 'vitest';
import type { AiRecommendationDto, CropTypeDetailDto, DeviceDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['saveDataNote']>[0];

const PARAMS = { location_id: '8', dev_eui: 'DEV-1' };
const ROWS = [{ id: 1, created_at: '2026-10-21T10:00:00.000Z', moisture: 30 }];
const LATEST = { id: 2, created_at: '2026-10-21T10:10:00.000Z', moisture: 31 };

const apiError = (status: number, message?: string) =>
	new ApiError(status, 'Error', {
		url: 'https://api.cropwatch.test/x',
		payload: message ? { message } : null
	});

function runLoad(
	locals: TestLocals,
	authToken: string | null = TEST_JWT,
	params: Record<string, string> = PARAMS,
	layout: { device?: Partial<DeviceDto> | null; dataTable?: string | null } = {}
) {
	return load(
		testEvent<LoadEvent>({
			locals,
			params,
			parent: { authToken, device: null, dataTable: null, ...layout }
		})
	);
}

const TOMATO = {
	id: 3,
	code: 'tomato',
	name_en: 'Tomato',
	name_ja: 'トマト',
	category: 'fruiting_vegetable',
	cultivation: 'both',
	sort_order: 10,
	notes: null,
	is_active: true,
	targets: []
} satisfies CropTypeDetailDto;

const AI_REPORT = {
	id: 3,
	dev_eui: 'DEV-1',
	report_type: 'daily',
	period_start: '2026-11-08',
	period_end: '2026-11-08',
	timezone: 'Asia/Tokyo',
	status: 'action',
	max_severity: 3,
	headline_ja: '対応が必要な項目があります',
	body_ja: '夜間の気温が目標より低めです。',
	headline_en: 'Some readings need attention',
	body_en: 'Night-time air temperature is below target.',
	findings: [],
	details: [],
	text_source: 'llm',
	created_at: '2026-11-08T16:32:49.779Z',
	updated_at: '2026-11-08T16:32:49.779Z'
} satisfies AiRecommendationDto;

const SOIL_WITH_CROP = {
	device: { dev_eui: 'DEV-1', crop_type_id: 3 },
	dataTable: 'cw_soil_data'
};

/** Real services over a fake fetch, to check the requests themselves. */
function httpLocals(responder: Parameters<typeof createFakeFetch>[0]) {
	const fake = createFakeFetch(responder);
	const services = createServerServices({
		fetch: fake.fetch,
		authToken: () => TEST_JWT,
		config: testPublicConfig(),
		serverConfig: testServerConfig()
	});
	return { fake, locals: { ...testLocals(), services } as unknown as TestLocals };
}

describe('device page load', () => {
	it('loads the first page of readings and the latest reading', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);

		await expect(runLoad(locals)).resolves.toEqual({
			deviceData: ROWS,
			latestData: LATEST,
			crop: null,
			aiReport: null
		});
		expect(locals.services.telemetry.getDeviceData).toHaveBeenCalledWith(
			'DEV-1',
			{ skip: 0, take: 144 },
			{ suppressNotFoundError: true }
		);
		expect(locals.services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-1', {
			suppressNotFoundError: true
		});
	});

	it('renders an empty device page while the device has no data (404)', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockRejectedValue(apiError(404));
		locals.services.telemetry.getDeviceLatestData.mockRejectedValue(apiError(404));

		await expect(runLoad(locals)).resolves.toEqual({
			deviceData: [],
			latestData: null,
			crop: null,
			aiReport: null
		});
	});

	it('treats empty answers as no data', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(null as never);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(null as never);

		await expect(runLoad(locals)).resolves.toEqual({
			deviceData: [],
			latestData: null,
			crop: null,
			aiReport: null
		});
	});

	it("loads a soil sensor's crop with its targets", async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		locals.services.crops.getCrop.mockResolvedValue(TOMATO);
		locals.services.aiRecommendations.getAiRecommendations.mockResolvedValue([]);

		await expect(
			runLoad(locals, TEST_JWT, PARAMS, {
				device: { dev_eui: 'DEV-1', crop_type_id: 3 },
				dataTable: 'cw_soil_data'
			})
		).resolves.toMatchObject({ crop: TOMATO });
		expect(locals.services.crops.getCrop).toHaveBeenCalledWith(3);
	});

	it("loads a soil sensor's newest daily AI report", async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		locals.services.crops.getCrop.mockResolvedValue(TOMATO);
		locals.services.aiRecommendations.getAiRecommendations.mockResolvedValue([AI_REPORT]);

		await expect(runLoad(locals, TEST_JWT, PARAMS, SOIL_WITH_CROP)).resolves.toMatchObject({
			crop: TOMATO,
			aiReport: AI_REPORT
		});
		expect(locals.services.aiRecommendations.getAiRecommendations).toHaveBeenCalledWith('DEV-1', {
			type: 'daily',
			limit: 1
		});
	});

	it('shows the page without the AI report before the first one, or when it cannot be loaded', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		locals.services.crops.getCrop.mockResolvedValue(TOMATO);

		locals.services.aiRecommendations.getAiRecommendations.mockResolvedValueOnce([]);
		await expect(runLoad(locals, TEST_JWT, PARAMS, SOIL_WITH_CROP)).resolves.toMatchObject({
			deviceData: ROWS,
			aiReport: null
		});

		locals.services.aiRecommendations.getAiRecommendations.mockRejectedValueOnce(apiError(500));
		await expect(runLoad(locals, TEST_JWT, PARAMS, SOIL_WITH_CROP)).resolves.toMatchObject({
			deviceData: ROWS,
			crop: TOMATO,
			aiReport: null
		});
	});

	it('shows the page without the crop when it cannot be loaded', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		locals.services.crops.getCrop.mockRejectedValue(apiError(404));
		locals.services.aiRecommendations.getAiRecommendations.mockResolvedValue([]);

		await expect(
			runLoad(locals, TEST_JWT, PARAMS, {
				device: { dev_eui: 'DEV-1', crop_type_id: 3 },
				dataTable: 'cw_soil_data'
			})
		).resolves.toMatchObject({ deviceData: ROWS, crop: null });
	});

	it('ignores an answer that is not a crop or a report list (an API without the routes)', async () => {
		// Such an API answers its HTML page with a 200 for any route it lacks.
		const html = '<!doctype html><html></html>';
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		locals.services.crops.getCrop.mockResolvedValue(html as never);
		locals.services.aiRecommendations.getAiRecommendations.mockResolvedValue(html as never);

		await expect(runLoad(locals, TEST_JWT, PARAMS, SOIL_WITH_CROP)).resolves.toMatchObject({
			deviceData: ROWS,
			crop: null,
			aiReport: null
		});
	});

	it('looks up no crop or AI report for other sensors, or a soil sensor without a crop', async () => {
		const locals = testLocals();
		locals.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		locals.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);

		for (const layout of [
			{ device: { dev_eui: 'DEV-1', crop_type_id: 3 }, dataTable: 'cw_air_data' },
			{ device: { dev_eui: 'DEV-1', crop_type_id: null }, dataTable: 'cw_soil_data' },
			{ device: null, dataTable: 'cw_soil_data' }
		]) {
			await expect(runLoad(locals, TEST_JWT, PARAMS, layout)).resolves.toMatchObject({
				crop: null
			});
		}
		expect(locals.services.crops.getCrop).not.toHaveBeenCalled();
		expect(locals.services.aiRecommendations.getAiRecommendations).not.toHaveBeenCalled();
	});

	it('fails on any other API error', async () => {
		const dataFails = testLocals();
		dataFails.services.telemetry.getDeviceData.mockRejectedValue(apiError(500));
		dataFails.services.telemetry.getDeviceLatestData.mockResolvedValue(LATEST);
		await expect(runLoad(dataFails)).rejects.toMatchObject({ status: 500 });

		const latestFails = testLocals();
		latestFails.services.telemetry.getDeviceData.mockResolvedValue(ROWS);
		latestFails.services.telemetry.getDeviceLatestData.mockRejectedValue(apiError(503));
		await expect(runLoad(latestFails)).rejects.toMatchObject({ status: 503 });
	});

	it('loads nothing without a session or with a location id that is not a number', async () => {
		const locals = testLocals();

		await expect(runLoad(locals, null)).resolves.toEqual({
			deviceData: [],
			latestData: null,
			crop: null,
			aiReport: null
		});
		await expect(runLoad(locals, TEST_JWT, { ...PARAMS, location_id: 'x' })).resolves.toEqual({
			deviceData: [],
			latestData: null,
			crop: null,
			aiReport: null
		});
		expect(locals.services.telemetry.getDeviceData).not.toHaveBeenCalled();
		expect(locals.services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
	});

	it('sends the same requests as before', async () => {
		const { fake, locals } = httpLocals(({ path }) =>
			path.startsWith('/devices/DEV-1/data') ? jsonResponse(ROWS) : jsonResponse(LATEST)
		);

		await expect(runLoad(locals)).resolves.toMatchObject({
			deviceData: [{ id: 1, moisture: 30 }],
			latestData: { id: 2, moisture: 31 }
		});
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /devices/DEV-1/data?skip=0&take=144',
			'GET /devices/DEV-1/latest-data'
		]);
		expect(fake.requests[0].headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});

describe('saveDataNote action', () => {
	const fields = {
		note: '  Watered the north rows  ',
		title: ' Irrigation ',
		include_in_report: 'true',
		created_at: '2026-10-21T10:00:00.000Z',
		dev_eui: 'DEV-1'
	};

	function save(locals: TestLocals, form: Record<string, string>) {
		return actions.saveDataNote(testEvent<ActionEvent>({ locals, request: formRequest(form) }));
	}

	it('saves the trimmed note against the reading', async () => {
		const locals = testLocals();
		locals.services.airNotes.createAirNote.mockResolvedValue(null);

		await expect(save(locals, fields)).resolves.toEqual({
			success: true,
			message: m.devices_save_note_success()
		});
		expect(locals.services.airNotes.createAirNote).toHaveBeenCalledWith({
			note: 'Watered the north rows',
			title: 'Irrigation',
			include_in_report: true,
			created_at: '2026-10-21T10:00:00.000Z',
			dev_eui: 'DEV-1'
		});
	});

	it('includes the note in reports unless the form says "false", and sends missing fields empty', async () => {
		const locals = testLocals();
		locals.services.airNotes.createAirNote.mockResolvedValue(null);

		await save(locals, { ...fields, include_in_report: 'false' });
		await save(locals, {});

		expect(locals.services.airNotes.createAirNote.mock.calls.map(([payload]) => payload)).toEqual([
			expect.objectContaining({ include_in_report: false }),
			{ note: '', title: '', include_in_report: true, created_at: '', dev_eui: '' }
		]);
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 401,
			data: { action: 'saveDataNote', message: m.devices_save_note_requires_login() }
		});
		expect(locals.services.airNotes.createAirNote).not.toHaveBeenCalled();
	});

	it("returns the API's status and message", async () => {
		const locals = testLocals();
		locals.services.airNotes.createAirNote.mockRejectedValue(apiError(422, 'Note is too long'));

		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 422,
			data: { action: 'saveDataNote', message: 'Note is too long' }
		});
	});

	it('answers 502 with the fallback for a failure that is not an API error', async () => {
		const locals = testLocals();
		locals.services.airNotes.createAirNote
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce({});

		// A network failure's own text ("Failed to fetch") is not for users.
		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 502,
			data: { action: 'saveDataNote', message: m.devices_save_note_failed() }
		});
		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 502,
			data: { action: 'saveDataNote', message: m.devices_save_note_failed() }
		});
	});

	it('answers an API error without a message with the fallback', async () => {
		const locals = testLocals();
		locals.services.airNotes.createAirNote.mockRejectedValue(apiError(500));

		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 500,
			data: { action: 'saveDataNote', message: m.devices_save_note_failed() }
		});
	});

	it('posts the same note as before', async () => {
		const { fake, locals } = httpLocals(() => jsonResponse({ id: 1 }));

		await save(locals, fields);

		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('POST /air/notes');
		expect(request.body).toEqual({
			note: 'Watered the north rows',
			title: 'Irrigation',
			include_in_report: true,
			created_at: '2026-10-21T10:00:00.000Z',
			dev_eui: 'DEV-1'
		});
	});
});
