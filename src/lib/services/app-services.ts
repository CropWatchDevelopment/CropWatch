import type { HttpClient } from '$lib/api/http/http-client';
import {
	HttpAccountRepository,
	type AccountRepository
} from '$lib/api/repositories/account.repository';
import {
	HttpAirNoteRepository,
	type AirNoteRepository
} from '$lib/api/repositories/air-notes.repository';
import {
	HttpBillingAdminRepository,
	type BillingAdminRepository
} from '$lib/api/repositories/billing-admin.repository';
import {
	HttpBillingRepository,
	type BillingRepository
} from '$lib/api/repositories/billing.repository';
import {
	HttpDashboardRepository,
	type DashboardRepository
} from '$lib/api/repositories/dashboard.repository';
import {
	HttpDeviceRepository,
	type DeviceRepository
} from '$lib/api/repositories/devices.repository';
import {
	HttpGatewayRepository,
	type GatewayRepository
} from '$lib/api/repositories/gateways.repository';
import { HttpLineRepository, type LineRepository } from '$lib/api/repositories/line.repository';
import {
	HttpLocationRepository,
	type LocationRepository
} from '$lib/api/repositories/locations.repository';
import {
	HttpOrganizationRepository,
	type OrganizationRepository
} from '$lib/api/repositories/organizations.repository';
import {
	HttpOverviewRepository,
	type OverviewRepository
} from '$lib/api/repositories/overview.repository';
import { HttpPushRepository, type PushRepository } from '$lib/api/repositories/push.repository';
import { HttpRelayRepository, type RelayRepository } from '$lib/api/repositories/relays.repository';
import {
	HttpReportRepository,
	type ReportRepository
} from '$lib/api/repositories/reports.repository';
import { HttpRuleRepository, type RuleRepository } from '$lib/api/repositories/rules.repository';
import {
	HttpTelemetryRepository,
	type TelemetryRepository
} from '$lib/api/repositories/telemetry.repository';
import type { ApiEndpointConfig } from '$lib/config/public';

/**
 * Everything a page, component or controller may use to read or write data.
 * Consumers depend on these interfaces only; the composition roots
 * (`hooks.server.ts` per request, the root layout in the browser) decide the
 * implementations, and tests inject mocks (see `$lib/testing`).
 */
export interface AppServices {
	account: AccountRepository;
	airNotes: AirNoteRepository;
	billing: BillingRepository;
	billingAdmin: BillingAdminRepository;
	dashboard: DashboardRepository;
	devices: DeviceRepository;
	gateways: GatewayRepository;
	line: LineRepository;
	locations: LocationRepository;
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
		airNotes: new HttpAirNoteRepository(http, endpoints),
		billing: new HttpBillingRepository(http),
		billingAdmin: new HttpBillingAdminRepository(http),
		dashboard: new HttpDashboardRepository(http),
		devices: new HttpDeviceRepository(http, endpoints),
		gateways: new HttpGatewayRepository(http),
		line: new HttpLineRepository(http),
		locations: new HttpLocationRepository(http),
		organizations: new HttpOrganizationRepository(http),
		overview: new HttpOverviewRepository(http),
		push: new HttpPushRepository(http),
		relays: new HttpRelayRepository(http),
		reports: new HttpReportRepository(http, endpoints),
		rules: new HttpRuleRepository(http, endpoints),
		telemetry: new HttpTelemetryRepository(http)
	};
}
