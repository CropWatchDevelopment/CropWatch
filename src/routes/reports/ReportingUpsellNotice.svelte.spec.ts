import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { BillingEntitlements } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ReportingUpsellNotice from './ReportingUpsellNotice.svelte';

function entitlements(overrides: Partial<BillingEntitlements> = {}): BillingEntitlements {
	return { billingMode: 'stripe', isStaff: false, seats: 2, reporting: false, ...overrides };
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
const originalHref = location.href;

function render(value: BillingEntitlements | null) {
	view = renderWithServices(ReportingUpsellNotice, {
		props: { entitlements: value },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const notice = () => view!.target.querySelector('.app-notice');
const subscribeButton = () =>
	document.getElementById('reports-upsell-subscribe-button') as HTMLButtonElement | null;

function subscribe() {
	subscribeButton()!.click();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	// The checkout redirect assigns location.href; put the test page back.
	history.replaceState(history.state, '', originalHref);
});

describe('ReportingUpsellNotice', () => {
	it('offers the reporting subscription to a user without it', () => {
		render(entitlements());

		expect(notice()?.classList.contains('app-notice--warning')).toBe(true);
		expect(notice()?.querySelector('.app-notice__title')?.textContent).toBe(
			m.reports_upsell_title()
		);
		expect(notice()?.textContent).toContain(m.reports_upsell_body());
		expect(subscribeButton()?.textContent?.trim()).toBe(m.reports_upsell_action());
	});

	it.each([
		['when the entitlements are unknown (fails open)', null],
		['to a user who has reporting', entitlements({ reporting: true })],
		['to staff', entitlements({ isStaff: true })]
	])('shows nothing %s', (_label, value) => {
		render(value);

		expect(notice()).toBeNull();
		expect(view!.target.textContent?.trim()).toBe('');
	});

	it('explains without a checkout button for invoiced (manual billing) customers', () => {
		render(entitlements({ billingMode: 'manual' }));

		expect(notice()?.textContent).toContain(m.reports_upsell_body());
		expect(subscribeButton()).toBeNull();
	});

	it('sends the user to the Stripe checkout', async () => {
		services.billing.createReportingCheckout.mockResolvedValue({
			checkoutUrl: '#reporting-checkout'
		});
		render(entitlements());

		subscribe();

		await expect.poll(() => location.hash).toBe('#reporting-checkout');
		expect(services.billing.createReportingCheckout).toHaveBeenCalledTimes(1);
		expect(services.billing.createReportingCheckout).toHaveBeenCalledWith();
		// Still busy while the browser leaves for Stripe.
		expect(subscribeButton()?.getAttribute('aria-busy')).toBe('true');
	});

	it('shows the button busy while the checkout is being created', () => {
		services.billing.createReportingCheckout.mockReturnValue(new Promise(() => {}));
		render(entitlements());

		subscribe();

		expect(subscribeButton()?.getAttribute('aria-busy')).toBe('true');
		expect(subscribeButton()?.disabled).toBe(true);
	});

	it.each([
		[
			"the API's message",
			new ApiError(502, 'Bad Gateway', {
				url: 'https://api.cropwatch.test/payments/subscriptions/reporting/checkout',
				payload: { message: 'Stripe is unavailable' }
			}),
			'Stripe is unavailable'
		],
		['the error message', new Error('Network down'), 'Network down'],
		['a generic message when there is none', {}, m.generic_error()]
	])(
		'shows %s when the checkout cannot be created, and can try again',
		async (_l, cause, message) => {
			services.billing.createReportingCheckout.mockRejectedValue(cause);
			render(entitlements());

			subscribe();

			await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
			expect(view!.toasts()[0]).toMatchObject({ tone: 'danger', message });
			expect(location.href).toBe(originalHref);
			await vi.waitFor(() => expect(subscribeButton()?.getAttribute('aria-busy')).not.toBe('true'));
			expect(subscribeButton()?.disabled).toBe(false);
		}
	);
});
