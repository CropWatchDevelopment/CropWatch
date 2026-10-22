import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions } from './+page.server';

type ActionEvent = Parameters<(typeof actions)['default']>[0];

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', {
		url: 'https://api.cropwatch.test/locations',
		payload: { message }
	});

function create(locals: TestLocals, fields: Record<string, string>) {
	return actions.default(testEvent<ActionEvent>({ locals, request: formRequest(fields) }));
}

function created(payload: unknown) {
	const locals = testLocals();
	locals.services.locations.createLocation.mockResolvedValue(payload as never);
	return locals;
}

const FIELDS = {
	name: ' Greenhouse A ',
	description: ' South field ',
	group: ' Farm ',
	lat: ' 31.9147 ',
	long: ' 131.4232 '
};

const ECHO = {
	name: 'Greenhouse A',
	description: 'South field',
	group: 'Farm',
	lat: '31.9147',
	long: '131.4232'
};

describe('create location action', () => {
	it('creates the location from the trimmed fields and returns its id', async () => {
		const locals = created({ location_id: 42, name: 'Greenhouse A' });

		await expect(create(locals, FIELDS)).resolves.toEqual({ success: true, location_id: 42 });
		expect(locals.services.locations.createLocation).toHaveBeenCalledWith({
			name: 'Greenhouse A',
			description: 'South field',
			group: 'Farm',
			lat: 31.9147,
			long: 131.4232
		});
	});

	it('sends null for blank optional fields', async () => {
		const locals = created({ location_id: 7 });

		await expect(create(locals, { name: 'Shed', description: ' ', lat: '' })).resolves.toEqual({
			success: true,
			location_id: 7
		});
		expect(locals.services.locations.createLocation).toHaveBeenCalledWith({
			name: 'Shed',
			description: null,
			group: null,
			lat: null,
			long: null
		});
	});

	it('reads the new id as a numeric string or nested in data / result', async () => {
		const cases: [unknown, number][] = [
			[{ location_id: '43' }, 43],
			[{ data: { location_id: 44 } }, 44],
			[{ result: { location_id: 45 } }, 45],
			[{ location_id: 'x', result: { data: { location_id: '46' } } }, 46],
			// 0 is an id like any other, not a missing one.
			[{ location_id: 0 }, 0],
			[{ location_id: '0' }, 0],
			[{ data: { location_id: 0 } }, 0]
		];
		for (const [payload, location_id] of cases) {
			await expect(create(created(payload), FIELDS)).resolves.toEqual({
				success: true,
				location_id
			});
		}
	});

	it('fails with 502, keeping the input, when the API returns no usable id', async () => {
		for (const payload of [
			{ name: 'no id' },
			{ location_id: 'abc' },
			{ location_id: null },
			{ data: [{ location_id: 9 }] },
			null,
			'created'
		]) {
			await expect(create(created(payload), FIELDS)).resolves.toMatchObject({
				status: 502,
				data: { error: m.locations_missing_location_id(), ...ECHO }
			});
		}
	});

	it('requires a name', async () => {
		const locals = testLocals();

		await expect(create(locals, { name: '  ', group: 'Farm' })).resolves.toMatchObject({
			status: 400,
			data: { error: m.validation_name_required(), name: '' }
		});
		await expect(create(locals, {})).resolves.toMatchObject({
			status: 400,
			data: { error: m.validation_name_required(), name: '' }
		});
		expect(locals.services.locations.createLocation).not.toHaveBeenCalled();
	});

	it('rejects coordinates that are not numbers, echoing every field', async () => {
		const locals = testLocals();

		await expect(create(locals, { ...FIELDS, lat: 'north' })).resolves.toMatchObject({
			status: 400,
			data: { error: m.locations_latitude_must_be_number(), ...ECHO, lat: 'north' }
		});
		await expect(create(locals, { name: 'Shed', long: 'east' })).resolves.toMatchObject({
			status: 400,
			data: {
				error: m.locations_longitude_must_be_number(),
				name: 'Shed',
				description: '',
				group: '',
				lat: '',
				long: 'east'
			}
		});
		expect(locals.services.locations.createLocation).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, keeping the input", async () => {
		const locals = testLocals();
		locals.services.locations.createLocation.mockRejectedValue(apiError(409, 'Name taken'));

		await expect(create(locals, FIELDS)).resolves.toMatchObject({
			status: 409,
			data: { error: 'Name taken', ...ECHO }
		});
	});

	it('fails with 500 and the fallback for other failures', async () => {
		const offline = testLocals();
		offline.services.locations.createLocation.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(create(offline, FIELDS)).resolves.toMatchObject({
			status: 500,
			data: { error: m.locations_create_failed() }
		});

		const silent = testLocals();
		silent.services.locations.createLocation.mockRejectedValue({});
		await expect(create(silent, FIELDS)).resolves.toMatchObject({
			status: 500,
			data: { error: m.locations_create_failed(), ...ECHO }
		});
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(create(locals, FIELDS)).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.locations.createLocation).not.toHaveBeenCalled();
	});
});
