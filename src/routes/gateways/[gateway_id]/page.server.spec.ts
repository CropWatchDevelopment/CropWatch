import { describe, expect, it } from 'vitest';
import type { GatewayDto } from '$lib/api/api.dtos';
import { testEvent, testLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const GATEWAY = { gateway_id: 'gw-1', gateway_name: 'North' } as GatewayDto;
const DEVICES = { devices: [{ dev_eui: 'A' }], other_device_count: 2 };

function run(authToken: string | null, locals = testLocals()) {
	return load(
		testEvent<LoadEvent>({ locals, params: { gateway_id: 'gw-1' }, parent: { authToken } })
	);
}

describe('gateway detail load', () => {
	it('loads the gateway and the devices it hears', async () => {
		const locals = testLocals();
		locals.services.gateways.getGateway.mockResolvedValue(GATEWAY);
		locals.services.gateways.getGatewayDevices.mockResolvedValue(DEVICES as never);

		await expect(run('jwt', locals)).resolves.toEqual({
			gateway: GATEWAY,
			gatewayDevices: DEVICES
		});
		expect(locals.services.gateways.getGateway).toHaveBeenCalledWith('gw-1');
		expect(locals.services.gateways.getGatewayDevices).toHaveBeenCalledWith('gw-1');
	});

	it('degrades each request independently when the API fails', async () => {
		const locals = testLocals();
		locals.services.gateways.getGateway.mockRejectedValue(new Error('down'));
		locals.services.gateways.getGatewayDevices.mockRejectedValue(new Error('down'));

		await expect(run('jwt', locals)).resolves.toEqual({
			gateway: null,
			gatewayDevices: { devices: [], other_device_count: 0 }
		});
	});

	it('does not call the API without a session', async () => {
		const locals = testLocals();

		await expect(run(null, locals)).resolves.toEqual({
			gateway: null,
			gatewayDevices: { devices: [], other_device_count: 0 }
		});
		expect(locals.services.gateways.getGateway).not.toHaveBeenCalled();
	});
});
