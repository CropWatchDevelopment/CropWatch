import { vi, type Mocked } from 'vitest';
import { HttpAccountRepository } from '#lib/api/repositories/account.repository.ts';
import { HttpAiRecommendationRepository } from '#lib/api/repositories/ai-recommendations.repository.ts';
import { HttpAirNoteRepository } from '#lib/api/repositories/air-notes.repository.ts';
import { HttpBillingAdminRepository } from '#lib/api/repositories/billing-admin.repository.ts';
import { HttpBillingRepository } from '#lib/api/repositories/billing.repository.ts';
import { HttpCropRepository } from '#lib/api/repositories/crops.repository.ts';
import { HttpDashboardRepository } from '#lib/api/repositories/dashboard.repository.ts';
import { HttpDeviceRepository } from '#lib/api/repositories/devices.repository.ts';
import { HttpGatewayRepository } from '#lib/api/repositories/gateways.repository.ts';
import { HttpGroupRepository } from '#lib/api/repositories/groups.repository.ts';
import { HttpLocationRepository } from '#lib/api/repositories/locations.repository.ts';
import { HttpOrganizationRepository } from '#lib/api/repositories/organizations.repository.ts';
import { HttpOverviewRepository } from '#lib/api/repositories/overview.repository.ts';
import { HttpPushRepository } from '#lib/api/repositories/push.repository.ts';
import { HttpRelayRepository } from '#lib/api/repositories/relays.repository.ts';
import { HttpReportRepository } from '#lib/api/repositories/reports.repository.ts';
import { HttpRuleRepository } from '#lib/api/repositories/rules.repository.ts';
import { HttpTelemetryRepository } from '#lib/api/repositories/telemetry.repository.ts';
import type { AppServices } from '#lib/services/app-services.ts';

/** Every repository method is a `vi.fn()`; stub what a test needs with `mockResolvedValue` & co. */
export type MockServices = { [K in keyof AppServices]: Mocked<AppServices[K]> };

/** The implementation behind each container key — only used to enumerate method names. */
const REPOSITORY_CLASSES: { [K in keyof AppServices]: { prototype: AppServices[K] } } = {
	account: HttpAccountRepository,
	aiRecommendations: HttpAiRecommendationRepository,
	airNotes: HttpAirNoteRepository,
	billing: HttpBillingRepository,
	billingAdmin: HttpBillingAdminRepository,
	crops: HttpCropRepository,
	dashboard: HttpDashboardRepository,
	devices: HttpDeviceRepository,
	deviceGroups: HttpGroupRepository,
	gateways: HttpGatewayRepository,
	locations: HttpLocationRepository,
	locationGroups: HttpGroupRepository,
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
