import type { AppServices } from '$lib/services/app-services';

/**
 * The wire contract of every repository method: what it must send to the
 * CropWatch API. Checked by `src/lib/api/repositories/repositories.spec.ts`.
 */
export interface RepositoryContractCase {
	repository: keyof AppServices;
	method: string;
	args: unknown[];
	/** JSON body the fake API answers with (default `{ ok: true }`). */
	response?: unknown;
	expected: {
		method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
		/** Path and query, relative to the API base URL. */
		path: string;
		body?: unknown;
		/** `'none'`: the request must carry no Authorization header even with a session. */
		auth?: 'session' | 'none';
	};
}

const DEVICE = 'A1B2C3D4E5F60708';
const ORG = 'org-1';

// One row per call, kept on one line each so the table reads as a table.
// prettier-ignore
export const REPOSITORY_CONTRACT: RepositoryContractCase[] = [
	// account
	{ repository: 'account', method: 'getUserProfile', args: [], expected: { method: 'GET', path: '/auth/user-profile' } },
	{ repository: 'account', method: 'updateProfile', args: [{ full_name: 'Ada' }], expected: { method: 'PATCH', path: '/auth/user-profile', body: { full_name: 'Ada' } } },
	{ repository: 'account', method: 'updateEmail', args: [{ email: 'ada@example.com' }], expected: { method: 'PATCH', path: '/auth/email', body: { email: 'ada@example.com' } } },
	{ repository: 'account', method: 'getPreferences', args: [], expected: { method: 'GET', path: '/auth/preferences' } },
	{ repository: 'account', method: 'updatePreferences', args: [{ unit: 'C' }], expected: { method: 'PATCH', path: '/auth/preferences', body: { unit: 'C' } } },
	{ repository: 'account', method: 'getLegalStatus', args: [], expected: { method: 'GET', path: '/auth/legal-status' } },
	{ repository: 'account', method: 'acceptLegalDocuments', args: [{ documents: ['terms'] }], expected: { method: 'POST', path: '/auth/legal-acceptance', body: { documents: ['terms'] } } },
	{ repository: 'account', method: 'getWhatsNewStatus', args: [], expected: { method: 'GET', path: '/auth/whats-new' } },
	{ repository: 'account', method: 'markWhatsNewSeen', args: [], expected: { method: 'POST', path: '/auth/whats-new/seen' } },
	{ repository: 'account', method: 'getAccountRemovalChallenge', args: [], expected: { method: 'GET', path: '/account-removal/challenge', auth: 'none' } },
	{ repository: 'account', method: 'requestAccountRemoval', args: [{ email: 'ada@example.com' }], expected: { method: 'POST', path: '/account-removal/request', body: { email: 'ada@example.com' }, auth: 'none' } },

	// line
	{ repository: 'line', method: 'startLineLink', args: [], expected: { method: 'POST', path: '/line/link-start' } },
	{ repository: 'line', method: 'createLineLinkCode', args: [], expected: { method: 'POST', path: '/line/link-code' } },
	{ repository: 'line', method: 'unlinkLine', args: [], expected: { method: 'DELETE', path: '/line/link' } },
	{ repository: 'line', method: 'getLineRecipientCandidates', args: [['A', 'B']], expected: { method: 'GET', path: '/line/recipients?devEuis=A%2CB' } },

	// push
	{ repository: 'push', method: 'registerPushToken', args: [{ token: 't1', device_id: 'd1' }], expected: { method: 'POST', path: '/push/tokens', body: { token: 't1', device_id: 'd1' } } },
	{ repository: 'push', method: 'refreshPushToken', args: [{ token: 't1', device_id: 'd1' }], expected: { method: 'POST', path: '/push/tokens/refresh', body: { token: 't1', device_id: 'd1' } } },
	{ repository: 'push', method: 'getPushDevices', args: [], expected: { method: 'GET', path: '/push/tokens' } },
	{ repository: 'push', method: 'removePushDevice', args: ['id/1'], expected: { method: 'DELETE', path: '/push/tokens/id%2F1' } },
	{ repository: 'push', method: 'getPushRecipientCandidates', args: [['A']], expected: { method: 'GET', path: '/push/recipients?devEuis=A' } },

	// organizations
	{ repository: 'organizations', method: 'getMeContext', args: [], expected: { method: 'GET', path: '/me/context' } },
	{ repository: 'organizations', method: 'getOrganization', args: [ORG], expected: { method: 'GET', path: '/orgs/org-1' } },
	{ repository: 'organizations', method: 'renameOrganization', args: [ORG, 'Farm'], expected: { method: 'PATCH', path: '/orgs/org-1', body: { name: 'Farm' } } },
	{ repository: 'organizations', method: 'upgradeOrganization', args: [ORG, 'Farm'], expected: { method: 'POST', path: '/orgs/org-1/upgrade', body: { name: 'Farm' } } },
	{ repository: 'organizations', method: 'listOrgMembers', args: [ORG], expected: { method: 'GET', path: '/orgs/org-1/members' } },
	{ repository: 'organizations', method: 'updateOrgMember', args: [ORG, 'u 1', { role: 'manager' }], expected: { method: 'PATCH', path: '/orgs/org-1/members/u%201', body: { role: 'manager' } } },
	{ repository: 'organizations', method: 'suspendOrgMember', args: [ORG, 'u1'], expected: { method: 'POST', path: '/orgs/org-1/members/u1/suspend' } },
	{ repository: 'organizations', method: 'reinstateOrgMember', args: [ORG, 'u1'], expected: { method: 'POST', path: '/orgs/org-1/members/u1/reinstate' } },
	{ repository: 'organizations', method: 'removeOrgMember', args: [ORG, 'u1'], expected: { method: 'DELETE', path: '/orgs/org-1/members/u1' } },
	{ repository: 'organizations', method: 'createOrgInvite', args: [ORG, { email: 'b@example.com', role: 'member' }], expected: { method: 'POST', path: '/orgs/org-1/invites', body: { email: 'b@example.com', role: 'member' } } },
	{ repository: 'organizations', method: 'listOrgInvites', args: [ORG], expected: { method: 'GET', path: '/orgs/org-1/invites' } },
	{ repository: 'organizations', method: 'revokeOrgInvite', args: [ORG, 'i1'], expected: { method: 'DELETE', path: '/orgs/org-1/invites/i1' } },
	{ repository: 'organizations', method: 'resendOrgInvite', args: [ORG, 'i1'], expected: { method: 'POST', path: '/orgs/org-1/invites/i1/resend' } },
	{ repository: 'organizations', method: 'previewInvite', args: ['tok'], expected: { method: 'GET', path: '/invites/tok', auth: 'none' } },
	{ repository: 'organizations', method: 'acceptInvite', args: ['tok'], expected: { method: 'POST', path: '/invites/tok/accept' } },
	{ repository: 'organizations', method: 'listOrgChildren', args: [ORG], expected: { method: 'GET', path: '/orgs/org-1/children' } },
	{ repository: 'organizations', method: 'createOrgLinkRequest', args: [ORG, 'org-2'], expected: { method: 'POST', path: '/orgs/org-1/children/requests', body: { child_org_id: 'org-2' } } },
	{ repository: 'organizations', method: 'listOrgParentRequests', args: [ORG], expected: { method: 'GET', path: '/orgs/org-1/parent-requests' } },
	{ repository: 'organizations', method: 'decideOrgParentRequest', args: [ORG, 'r1', 'accept'], expected: { method: 'POST', path: '/orgs/org-1/parent-requests/r1/accept' } },
	{ repository: 'organizations', method: 'unlinkOrgChild', args: [ORG, 'org-2'], expected: { method: 'DELETE', path: '/orgs/org-1/children/org-2' } },

	// devices
	{ repository: 'devices', method: 'getDevices', args: [{ group: 'North', name: 'Pump' }], response: { data: [{ dev_eui: DEVICE }], total: 1 }, expected: { method: 'GET', path: '/devices?group=North&name=Pump' } },
	{ repository: 'devices', method: 'getAllDevices', args: [{ location: 8 }], response: [{ dev_eui: DEVICE }], expected: { method: 'GET', path: '/devices?skip=0&take=1000&location=8' } },
	{ repository: 'devices', method: 'getAllLocationDevices', args: [8], response: { result: { items: [{ dev_eui: DEVICE }], count: 1 } }, expected: { method: 'GET', path: '/devices/location/8' } },
	{ repository: 'devices', method: 'getDeviceStatuses', args: [], expected: { method: 'GET', path: '/devices/status' } },
	{ repository: 'devices', method: 'getDeviceGroups', args: [], expected: { method: 'GET', path: '/devices/groups' } },
	{ repository: 'devices', method: 'getDeviceTypes', args: [], response: { items: [{ id: 1 }] }, expected: { method: 'GET', path: '/devices/device-types' } },
	{ repository: 'devices', method: 'getDevice', args: ['dev/1'], expected: { method: 'GET', path: '/devices/dev%2F1' } },
	{ repository: 'devices', method: 'updateDevice', args: [DEVICE, { name: 'Pump' }], expected: { method: 'PATCH', path: `/devices/${DEVICE}`, body: { name: 'Pump' } } },
	{ repository: 'devices', method: 'deleteDevice', args: [DEVICE], expected: { method: 'DELETE', path: `/devices/${DEVICE}` } },
	{ repository: 'devices', method: 'updateDevicePermissionLevel', args: [DEVICE, { targetUserEmail: 'b@example.com', permissionLevel: 2 }], expected: { method: 'PATCH', path: `/devices/${DEVICE}/permission-level`, body: { targetUserEmail: 'b@example.com', permissionLevel: 2, dev_eui: DEVICE } } },
	{ repository: 'devices', method: 'lookupDeviceSetup', args: [{ dev_eui: DEVICE, location_id: 8 }], expected: { method: 'POST', path: '/device-setup/lookup', body: { dev_eui: DEVICE, location_id: 8 } } },
	{ repository: 'devices', method: 'setupDevice', args: [{ dev_eui: DEVICE, location_id: 8 }], expected: { method: 'POST', path: '/device-setup', body: { dev_eui: DEVICE, location_id: 8 } } },

	// telemetry
	{ repository: 'telemetry', method: 'getDeviceLatestData', args: [DEVICE], response: { created_at: '2026-03-08 12:00:00' }, expected: { method: 'GET', path: `/devices/${DEVICE}/latest-data` } },
	{ repository: 'telemetry', method: 'getDeviceData', args: [DEVICE, { skip: 0, take: 50 }], expected: { method: 'GET', path: `/devices/${DEVICE}/data?skip=0&take=50` } },
	{ repository: 'telemetry', method: 'getDeviceDataWithinRange', args: [DEVICE, { start: new Date('2026-03-01T00:00:00Z'), end: '2026-03-02T00:00:00.000Z', timezone: 'Asia/Tokyo' }], expected: { method: 'GET', path: `/devices/${DEVICE}/data-within-range?start=2026-03-01T00%3A00%3A00.000Z&end=2026-03-02T00%3A00%3A00.000Z&timezone=Asia%2FTokyo` } },
	{ repository: 'telemetry', method: 'getTrafficData', args: [DEVICE, { start: '2026-03-01', timezone: 'UTC' }], expected: { method: 'GET', path: `/traffic/${DEVICE}?start=2026-03-01&timezone=UTC` } },
	{ repository: 'telemetry', method: 'getTrafficMonthlyReport', args: [DEVICE, { year: 2026, month: 3, timezone: 'UTC' }], expected: { method: 'GET', path: `/traffic/${DEVICE}/monthly?year=2026&month=3&timezone=UTC` } },

	// relays
	{ repository: 'relays', method: 'getRelayData', args: [DEVICE], expected: { method: 'GET', path: `/relay/${DEVICE}` } },
	{ repository: 'relays', method: 'updateRelay', args: [DEVICE, { relay: 1, state: 'on' }], expected: { method: 'PATCH', path: `/relay/${DEVICE}`, body: { relay: 1, state: 'on' } } },
	{ repository: 'relays', method: 'pulseRelay', args: [DEVICE, { relay: 1, seconds: 5 }], expected: { method: 'POST', path: `/relay/${DEVICE}/pulse`, body: { relay: 1, seconds: 5 } } },
	{ repository: 'relays', method: 'getRelayHistory', args: [DEVICE, { start: '2026-03-01T00:00:00.000Z' }], expected: { method: 'GET', path: `/relay/${DEVICE}/history?start=2026-03-01T00%3A00%3A00.000Z` } },
	{ repository: 'relays', method: 'requestRelayStatus', args: [DEVICE], expected: { method: 'POST', path: `/relay/${DEVICE}/status-request` } },

	// air notes
	{ repository: 'airNotes', method: 'createAirNote', args: [{ note: 'n', title: 't', include_in_report: true, created_at: '2026-03-08T07:00:00.000-05:00', dev_eui: DEVICE }], expected: { method: 'POST', path: '/air/notes', body: { note: 'n', title: 't', include_in_report: true, created_at: '2026-03-08T12:00:00.000Z', dev_eui: DEVICE } } },
	{ repository: 'airNotes', method: 'updateAirNote', args: [7, { title: 't' }], expected: { method: 'PATCH', path: '/air/notes/7', body: { title: 't' } } },
	{ repository: 'airNotes', method: 'deleteAirNote', args: [7], expected: { method: 'DELETE', path: '/air/notes/7' } },
	{ repository: 'airNotes', method: 'getAllAirNotesForMonth', args: [{ dev_eui: DEVICE, date: new Date(2026, 2, 15) }], expected: { method: 'GET', path: `/air/notes/${DEVICE}/month/03/year/2026` } },

	// locations
	{ repository: 'locations', method: 'getAllLocations', args: [{ name: 'Farm' }], response: [{ location_id: 8 }], expected: { method: 'GET', path: '/locations?name=Farm' } },
	{ repository: 'locations', method: 'getLocations', args: [], response: { data: [{ location_id: 8 }], total: 1 }, expected: { method: 'GET', path: '/locations' } },
	{ repository: 'locations', method: 'getLocation', args: [8], expected: { method: 'GET', path: '/locations/8' } },
	{ repository: 'locations', method: 'getLocationGroups', args: [], expected: { method: 'GET', path: '/locations/groups' } },
	{ repository: 'locations', method: 'createLocation', args: [{ name: 'Farm', lat: 1, long: 2 }], expected: { method: 'POST', path: '/locations', body: { name: 'Farm', lat: 1, long: 2 } } },
	{ repository: 'locations', method: 'updateLocation', args: ['8', { name: 'Farm' }], expected: { method: 'PATCH', path: '/locations/8', body: { name: 'Farm' } } },
	{ repository: 'locations', method: 'getLocationDeletePreflight', args: [8], expected: { method: 'GET', path: '/locations/8/delete-preflight' } },
	{ repository: 'locations', method: 'deleteLocation', args: [8], expected: { method: 'DELETE', path: '/locations/8' } },
	{ repository: 'locations', method: 'createLocationPermission', args: [8, 'b@example.com', 2, true], expected: { method: 'POST', path: '/locations/8/permission?newUserEmail=b%40example.com&permission_level=2&applyToAllDevices=true', body: { location_id: 8, user_email: 'b@example.com', applyToAllDevices: true } } },
	{ repository: 'locations', method: 'updateLocationPermission', args: [8, { id: 3, permission_level: 1 }, false], expected: { method: 'PATCH', path: '/locations/8/permission?applyToAllDevices=false', body: { id: 3, permission_level: 1 } } },
	{ repository: 'locations', method: 'updateLocationPermissionLevel', args: [8, 'b@example.com', 3], expected: { method: 'PATCH', path: '/locations/8/permission-level', body: { location_id: 8, email: 'b@example.com', permission_level: 3 } } },
	{ repository: 'locations', method: 'deleteLocationPermission', args: [8, 3], expected: { method: 'DELETE', path: '/locations/8/permission?permission_id=3' } },

	// dashboard
	{ repository: 'dashboard', method: 'getDashboardDevices', args: [{ skip: 0, take: 20, locationGroup: 'East' }], expected: { method: 'GET', path: '/dashboard/devices?skip=0&take=20&locationGroup=East' } },
	{ repository: 'dashboard', method: 'getDashboardLocations', args: [{ name: 'Farm' }], expected: { method: 'GET', path: '/dashboard/locations?name=Farm' } },
	{ repository: 'dashboard', method: 'getDashboardDeviceLatest', args: [DEVICE], expected: { method: 'GET', path: `/dashboard/devices/${DEVICE}/latest` } },

	// rules
	{ repository: 'rules', method: 'getTriggeredRules', args: [], expected: { method: 'GET', path: '/rules/triggered' } },
	{ repository: 'rules', method: 'getTriggeredRulesCount', args: [], expected: { method: 'GET', path: '/rules/triggered/count' } },
	{ repository: 'rules', method: 'getRuleTemplates', args: [{ search: 'frost' }], expected: { method: 'GET', path: '/rules?search=frost' } },
	{ repository: 'rules', method: 'getRuleTemplateHistory', args: [4], expected: { method: 'GET', path: '/rules/4/history' } },
	{ repository: 'rules', method: 'getRuleFormContext', args: [4], expected: { method: 'GET', path: '/rules/form-context?templateId=4' } },
	{ repository: 'rules', method: 'getRuleFormContext', args: [], expected: { method: 'GET', path: '/rules/form-context' } },
	{ repository: 'rules', method: 'createRuleTemplate', args: [{ name: 'Frost' }], expected: { method: 'POST', path: '/rules', body: { name: 'Frost' } } },
	{ repository: 'rules', method: 'updateRuleTemplate', args: [4, { name: 'Frost' }], expected: { method: 'PATCH', path: '/rules/4', body: { name: 'Frost' } } },
	{ repository: 'rules', method: 'deleteRuleTemplate', args: [4], expected: { method: 'DELETE', path: '/rules/4' } },

	// reports
	{ repository: 'reports', method: 'getReportTemplates', args: [{ search: 'weekly' }], expected: { method: 'GET', path: '/reports?search=weekly' } },
	{ repository: 'reports', method: 'getReportTemplate', args: [5], expected: { method: 'GET', path: '/reports/5' } },
	{ repository: 'reports', method: 'getReportTemplateHistory', args: [5], expected: { method: 'GET', path: '/reports/5/history' } },
	{ repository: 'reports', method: 'getReportRegenerations', args: [5], expected: { method: 'GET', path: '/reports/5/regenerations' } },
	{ repository: 'reports', method: 'requestReportRegeneration', args: [5, { dev_eui: DEVICE, period_start: '2026-03-01' }], expected: { method: 'POST', path: '/reports/5/regenerate', body: { dev_eui: DEVICE, period_start: '2026-03-01' } } },
	{ repository: 'reports', method: 'getReportFormContext', args: [5], expected: { method: 'GET', path: '/reports/form-context?templateId=5' } },
	{ repository: 'reports', method: 'createReportTemplate', args: [{ name: 'Weekly' }], expected: { method: 'POST', path: '/reports', body: { name: 'Weekly' } } },
	{ repository: 'reports', method: 'updateReportTemplate', args: [5, { name: 'Weekly' }], expected: { method: 'PATCH', path: '/reports/5', body: { name: 'Weekly' } } },
	{ repository: 'reports', method: 'deleteReportTemplate', args: [5], expected: { method: 'DELETE', path: '/reports/5' } },
	{ repository: 'reports', method: 'getReportTemplateDownloadUrl', args: [DEVICE, 'March report.pdf'], expected: { method: 'GET', path: `/reports/download/${DEVICE}/March%20report.pdf` } },

	// overview
	{ repository: 'overview', method: 'getOverview', args: [], expected: { method: 'GET', path: '/overview?range=24h' } },
	{ repository: 'overview', method: 'getOverview', args: ['7d'], expected: { method: 'GET', path: '/overview?range=7d' } },

	// gateways
	{ repository: 'gateways', method: 'getGateways', args: [], expected: { method: 'GET', path: '/gateway' } },
	{ repository: 'gateways', method: 'getGateway', args: ['gw 1'], expected: { method: 'GET', path: '/gateway/gw%201' } },
	{ repository: 'gateways', method: 'getGatewayDevices', args: ['gw-1'], expected: { method: 'GET', path: '/gateway/gw-1/devices' } },
	{ repository: 'gateways', method: 'getDeviceGateways', args: [DEVICE], expected: { method: 'GET', path: `/gateway/by-device/${DEVICE}` } },

	// billing
	{ repository: 'billing', method: 'getBillingProducts', args: [], expected: { method: 'GET', path: '/payments/products' } },
	{ repository: 'billing', method: 'getSubscriptionState', args: [], expected: { method: 'GET', path: '/payments/subscriptions/state' } },
	{ repository: 'billing', method: 'getLicenses', args: [], expected: { method: 'GET', path: '/payments/licenses' } },
	{ repository: 'billing', method: 'getBillingEntitlements', args: [], expected: { method: 'GET', path: '/payments/entitlements' } },
	{ repository: 'billing', method: 'createDeviceCheckout', args: [{ quantity: 3 }], expected: { method: 'POST', path: '/payments/subscriptions/device/checkout', body: { quantity: 3 } } },
	{ repository: 'billing', method: 'changeDeviceSeats', args: [{ seats: 4 }], expected: { method: 'PATCH', path: '/payments/subscriptions/device/seats', body: { seats: 4 } } },
	{ repository: 'billing', method: 'assignLicense', args: [9, DEVICE], expected: { method: 'POST', path: '/payments/licenses/9/assign', body: { devEui: DEVICE } } },
	{ repository: 'billing', method: 'moveLicense', args: [9, DEVICE], expected: { method: 'PATCH', path: '/payments/licenses/9/move', body: { devEui: DEVICE } } },
	{ repository: 'billing', method: 'unassignLicense', args: [9], expected: { method: 'POST', path: '/payments/licenses/9/unassign' } },
	{ repository: 'billing', method: 'cancelLicense', args: [9], expected: { method: 'POST', path: '/payments/licenses/9/cancel' } },
	{ repository: 'billing', method: 'openBillingPortal', args: [], expected: { method: 'POST', path: '/payments/portal' } },
	{ repository: 'billing', method: 'cancelDeviceSubscription', args: [{ atPeriodEnd: true }], expected: { method: 'DELETE', path: '/payments/subscriptions/device', body: { atPeriodEnd: true } } },
	{ repository: 'billing', method: 'cancelDeviceSubscription', args: [], expected: { method: 'DELETE', path: '/payments/subscriptions/device', body: {} } },
	{ repository: 'billing', method: 'createReportingCheckout', args: [], expected: { method: 'POST', path: '/payments/subscriptions/reporting/checkout' } },
	{ repository: 'billing', method: 'cancelReportingSubscription', args: [], expected: { method: 'DELETE', path: '/payments/subscriptions/reporting', body: {} } },

	// billing administration
	{ repository: 'billingAdmin', method: 'adminListBillingCustomers', args: [], expected: { method: 'GET', path: '/payments/admin/customers' } },
	{ repository: 'billingAdmin', method: 'adminSetBillingMode', args: ['u 1', 'manual'], expected: { method: 'PATCH', path: '/payments/admin/customers/u%201/billing-mode', body: { billingMode: 'manual' } } },
	{ repository: 'billingAdmin', method: 'adminSetManualSeats', args: ['u1', 12], expected: { method: 'PUT', path: '/payments/admin/customers/u1/manual-seats', body: { seats: 12 } } },
	{ repository: 'billingAdmin', method: 'adminSetReportingManual', args: ['u1', true], expected: { method: 'PATCH', path: '/payments/admin/customers/u1/reporting', body: { manual: true } } }
];
