import { vi, type Mocked } from 'vitest';
import { HttpAccountRepository } from '$lib/api/repositories/account.repository';
import { HttpAirNoteRepository } from '$lib/api/repositories/air-notes.repository';
import { HttpBillingAdminRepository } from '$lib/api/repositories/billing-admin.repository';
import { HttpBillingRepository } from '$lib/api/repositories/billing.repository';
import { HttpDashboardRepository } from '$lib/api/repositories/dashboard.repository';
import { HttpDeviceRepository } from '$lib/api/repositories/devices.repository';
import { HttpGatewayRepository } from '$lib/api/repositories/gateways.repository';
import { HttpLineRepository } from '$lib/api/repositories/line.repository';
import { HttpLocationRepository } from '$lib/api/repositories/locations.repository';
import { HttpOrganizationRepository } from '$lib/api/repositories/organizations.repository';
import { HttpOverviewRepository } from '$lib/api/repositories/overview.repository';
import { HttpPushRepository } from '$lib/api/repositories/push.repository';
import { HttpRelayRepository } from '$lib/api/repositories/relays.repository';
import { HttpReportRepository } from '$lib/api/repositories/reports.repository';
import { HttpRuleRepository } from '$lib/api/repositories/rules.repository';
import { HttpTelemetryRepository } from '$lib/api/repositories/telemetry.repository';
import type { AppServices } from '$lib/services/app-services';

/** Every repository method is a `vi.fn()`; stub what a test needs with `mockResolvedValue` & co. */
export type MockServices = { [K in keyof AppServices]: Mocked<AppServices[K]> };

/** The implementation behind each container key — only used to enumerate method names. */
const REPOSITORY_CLASSES: { [K in keyof AppServices]: { prototype: AppServices[K] } } = {
	account: HttpAccountRepository,
	airNotes: HttpAirNoteRepository,
	billing: HttpBillingRepository,
	billingAdmin: HttpBillingAdminRepository,
	dashboard: HttpDashboardRepository,
	devices: HttpDeviceRepository,
	gateways: HttpGatewayRepository,
	line: HttpLineRepository,
	locations: HttpLocationRepository,
	organizations: HttpOrganizationRepository,
	overview: HttpOverviewRepository,
	push: HttpPushRepository,
	relays: HttpRelayRepository,
	reports: HttpReportRepository,
	rules: HttpRuleRepository,
	telemetry: HttpTelemetryRepository
};

function mockRepository(name: string, prototype: object): Record<string, unknown> {
	const methods = Object.getOwnPropertyNames(prototype).filter((key) => key !== 'constructor');
	return Object.fromEntries(
		methods.map((method) => [
			method,
			// An unstubbed call fails loudly instead of silently resolving `undefined`.
			vi.fn(() =>
				Promise.reject(new Error(`services.${name}.${method}() was called but not stubbed`))
			)
		])
	);
}

/**
 * A complete {@link AppServices} made of mocks — nothing in it can perform
 * I/O. Pass it to `renderWithServices` (components) or put it on
 * `locals.services` (server loads and actions).
 */
export function createMockServices(): MockServices {
	return Object.fromEntries(
		Object.entries(REPOSITORY_CLASSES).map(([name, repository]) => [
			name,
			mockRepository(name, repository.prototype)
		])
	) as unknown as MockServices;
}
