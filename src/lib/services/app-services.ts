import type { HttpClient } from '#lib/api/http/http-client.ts';
import {
	HttpAccountRepository,
	type AccountRepository
} from '#lib/api/repositories/account.repository.ts';
import {
	HttpAiRecommendationRepository,
	type AiRecommendationRepository
} from '#lib/api/repositories/ai-recommendations.repository.ts';
import {
	HttpAirNoteRepository,
	type AirNoteRepository
} from '#lib/api/repositories/air-notes.repository.ts';
import {
	HttpBillingAdminRepository,
	type BillingAdminRepository
} from '#lib/api/repositories/billing-admin.repository.ts';
import {
	HttpBillingRepository,
	type BillingRepository
} from '#lib/api/repositories/billing.repository.ts';
import { HttpCropRepository, type CropRepository } from '#lib/api/repositories/crops.repository.ts';
import {
	HttpDashboardRepository,
	type DashboardRepository
} from '#lib/api/repositories/dashboard.repository.ts';
import {
	HttpDeviceRepository,
	type DeviceRepository
} from '#lib/api/repositories/devices.repository.ts';
import {
	HttpGatewayRepository,
	type GatewayRepository
} from '#lib/api/repositories/gateways.repository.ts';
import {
	HttpGroupRepository,
	type GroupRepository
} from '#lib/api/repositories/groups.repository.ts';
import { HttpLineRepository, type LineRepository } from '#lib/api/repositories/line.repository.ts';
import {
	HttpLocationRepository,
	type LocationRepository
} from '#lib/api/repositories/locations.repository.ts';
import {
	HttpOrganizationRepository,
	type OrganizationRepository
} from '#lib/api/repositories/organizations.repository.ts';
import {
	HttpOverviewRepository,
	type OverviewRepository
} from '#lib/api/repositories/overview.repository.ts';
import { HttpPushRepository, type PushRepository } from '#lib/api/repositories/push.repository.ts';
import {
	HttpRelayRepository,
	type RelayRepository
} from '#lib/api/repositories/relays.repository.ts';
import {
	HttpReportRepository,
	type ReportRepository
} from '#lib/api/repositories/reports.repository.ts';
import { HttpRuleRepository, type RuleRepository } from '#lib/api/repositories/rules.repository.ts';
import {
	HttpTelemetryRepository,
	type TelemetryRepository
} from '#lib/api/repositories/telemetry.repository.ts';
import type { ApiEndpointConfig } from '#lib/config/public.ts';

/**
 * Everything a page, component or controller may use to read or write data.
 * Consumers depend on these interfaces only; the composition roots
 * (`hooks.server.ts` per request, the root layout in the browser) decide the
 * implementations, and tests inject mocks (see `#lib/testing`).
 */
export interface AppServices {
	account: AccountRepository;
	aiRecommendations: AiRecommendationRepository;
	airNotes: AirNoteRepository;
	billing: BillingRepository;
	billingAdmin: BillingAdminRepository;
	crops: CropRepository;
	dashboard: DashboardRepository;
	devices: DeviceRepository;
	/** Groups a device can be put in (`/device-groups`). */
	deviceGroups: GroupRepository;
	gateways: GatewayRepository;
	line: LineRepository;
	locations: LocationRepository;
	/** Groups a location can be put in (`/location-groups`). */
	locationGroups: GroupRepository;
	organizations: OrganizationRepository;
	overview: OverviewRepository;
	push: PushRepository;
	relays: RelayRepository;
	reports: ReportRepository;
	rules: RuleRepository;
	telemetry: TelemetryRepository;
}

/** Wires every repository to one HTTP client (and the env-configurable API paths). */
export function createAppServices(http: HttpClient, endpoints: ApiEndpointConfig): AppServices {
	return {
		account: new HttpAccountRepository(http),
		aiRecommendations: new HttpAiRecommendationRepository(http),
		airNotes: new HttpAirNoteRepository(http, endpoints),
		billing: new HttpBillingRepository(http),
		billingAdmin: new HttpBillingAdminRepository(http),
		crops: new HttpCropRepository(http),
		dashboard: new HttpDashboardRepository(http),
		devices: new HttpDeviceRepository(http, endpoints),
		deviceGroups: new HttpGroupRepository(http, '/device-groups'),
		gateways: new HttpGatewayRepository(http),
		line: new HttpLineRepository(http),
		locations: new HttpLocationRepository(http),
		locationGroups: new HttpGroupRepository(http, '/location-groups'),
		organizations: new HttpOrganizationRepository(http),
		overview: new HttpOverviewRepository(http),
		push: new HttpPushRepository(http),
		relays: new HttpRelayRepository(http),
		reports: new HttpReportRepository(http, endpoints),
		rules: new HttpRuleRepository(http, endpoints),
		telemetry: new HttpTelemetryRepository(http)
	};
}
