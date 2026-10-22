import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { GatewayDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import GatewaysPage from './+page.svelte';

const { goto, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	appPage: { url: new URL('http://localhost/gateways') }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: appPage }));

function gateway(overrides: Partial<GatewayDto>): GatewayDto {
	return {
		id: 1,
		gateway_id: 'gw-1',
		gateway_name: 'North Gateway',
		is_online: true,
		is_public: false,
		created_at: '2026-04-22T00:00:00.000Z',
		updated_at: null,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	appPage.url = new URL('http://localhost/gateways');
});

describe('gateways page', () => {
	it('lists the gateways the API returns', async () => {
		const services = createMockServices();
		services.gateways.getGateways.mockResolvedValue([
			gateway({ gateway_name: 'North Gateway' }),
			gateway({ id: 2, gateway_id: 'gw-2', gateway_name: 'South Gateway', is_online: false })
		]);

		view = renderWithServices(GatewaysPage, { services });

		await expect.poll(() => view?.target.textContent).toContain('South Gateway');
		expect(view.target.textContent).toContain('North Gateway');
		expect(view.target.textContent).toContain(m.gateways_offline());
		expect(services.gateways.getGateways).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
	});

	it('opens a gateway when its row is clicked', async () => {
		const services = createMockServices();
		services.gateways.getGateways.mockResolvedValue([gateway({ gateway_id: 'gw 7' })]);

		view = renderWithServices(GatewaysPage, { services });
		await expect.poll(() => view?.target.textContent).toContain('North Gateway');
		const cell = [...view.target.querySelectorAll('td')].find((td) =>
			td.textContent?.includes('North Gateway')
		);
		cell?.click();

		expect(goto).toHaveBeenCalledWith('/gateways/gw 7');
	});

	it("shows the API's error message when the gateways cannot be loaded", async () => {
		const services = createMockServices();
		services.gateways.getGateways.mockRejectedValue(
			new ApiError(503, 'Service Unavailable', {
				url: '/gateways',
				payload: { message: 'Gateway service unavailable' }
			})
		);

		view = renderWithServices(GatewaysPage, { services });

		await expect.poll(() => view?.target.textContent).toContain('Gateway service unavailable');
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', { url: '', payload: null })
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the translated fallback for %s', async (_case, failure) => {
		const services = createMockServices();
		services.gateways.getGateways.mockRejectedValue(failure);

		view = renderWithServices(GatewaysPage, { services });

		await expect.poll(() => view?.target.textContent).toContain(m.generic_error());
		expect(view.target.textContent).not.toContain('Failed to fetch');
		expect(view.target.textContent).not.toContain('CropWatch API request failed');
	});

	it('marks public and private gateways with their icons', async () => {
		const services = createMockServices();
		services.gateways.getGateways.mockResolvedValue([
			gateway({ gateway_name: 'Shared Gateway', is_public: true }),
			gateway({ id: 2, gateway_id: 'gw-2', gateway_name: 'Own Gateway', is_public: false })
		]);

		view = renderWithServices(GatewaysPage, { services });

		await expect.poll(() => view?.target.textContent).toContain('Own Gateway');
		// Icon renders a coloured <img> for "public" and a masked span (role=img) for "private".
		const labels = [...view.target.querySelectorAll('tbody img, tbody [role="img"]')].map(
			(icon) => icon.getAttribute('alt') ?? icon.getAttribute('aria-label')
		);
		expect(labels).toContain(m.gateways_public());
		expect(labels).toContain(m.gateways_private());
	});

	it('goes back to the dashboard by default', async () => {
		const services = createMockServices();
		services.gateways.getGateways.mockResolvedValue([]);

		view = renderWithServices(GatewaysPage, { services });
		view.target.querySelector<HTMLButtonElement>('#gateways-back-button')?.click();

		expect(goto).toHaveBeenCalledWith('/');
	});

	it('goes back to the page named in backTo', async () => {
		appPage.url = new URL('http://localhost/gateways?backTo=/locations/3');
		const services = createMockServices();
		services.gateways.getGateways.mockResolvedValue([]);

		view = renderWithServices(GatewaysPage, { services });
		view.target.querySelector<HTMLButtonElement>('#gateways-back-button')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/3');
	});
});
