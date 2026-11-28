import { spawn } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';

const APP_PORT = 4173;
const MOCK_PORT = 4174;
const VALID_EMAIL = 'operator@cropwatch.test';
const VALID_PASSWORD = 'CorrectHorseBatteryStaple1!';

function encodeSegment(value) {
	return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(expirationOffsetSeconds = 60 * 60) {
	return [
		encodeSegment({ alg: 'HS256', typ: 'JWT' }),
		encodeSegment({
			sub: 'playwright-user',
			email: VALID_EMAIL,
			role: 'operator',
			exp: Math.floor(Date.now() / 1000) + expirationOffsetSeconds,
			user_metadata: {
				full_name: 'Playwright Operator',
				name: 'playwright-operator'
			}
		}),
		'test-signature'
	].join('.');
}

/** The claims of a token this mock issued (signature `test-signature`, not expired), else null. */
function readMockToken(authorization) {
	const [header, payload, signature] = String(authorization ?? '')
		.replace(/^Bearer /, '')
		.split('.');
	if (!header || !payload || signature !== 'test-signature') return null;

	try {
		const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		return typeof claims.exp === 'number' && claims.exp > Date.now() / 1000 ? claims : null;
	} catch {
		return null;
	}
}

async function readJsonBody(request) {
	const chunks = [];

	for await (const chunk of request) {
		chunks.push(chunk);
	}

	const rawBody = Buffer.concat(chunks).toString('utf8');
	return rawBody ? JSON.parse(rawBody) : {};
}

function writeJson(response, statusCode, payload) {
	response.writeHead(statusCode, {
		'content-type': 'application/json'
	});
	response.end(JSON.stringify(payload));
}

function createMockServer() {
	return http.createServer(async (request, response) => {
		const url = new URL(request.url ?? '/', `http://127.0.0.1:${MOCK_PORT}`);

		// The app's pages call the API from the browser too (another origin).
		response.setHeader('access-control-allow-origin', `http://127.0.0.1:${APP_PORT}`);
		response.setHeader('access-control-allow-credentials', 'true');
		response.setHeader('access-control-allow-headers', 'authorization, content-type, accept');
		response.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
		if (request.method === 'OPTIONS') {
			response.writeHead(204);
			response.end();
			return;
		}

		if (request.method === 'POST' && /^\/v1\/projects\/[^/]+\/assessments$/.test(url.pathname)) {
			const body = await readJsonBody(request);
			const token = String(body?.event?.token ?? '');
			const action = String(body?.event?.expectedAction ?? 'LOGIN');

			if (!token || token.includes('invalid')) {
				writeJson(response, 200, {
					tokenProperties: {
						valid: false,
						invalidReason: 'MALFORMED'
					}
				});
				return;
			}

			writeJson(response, 200, {
				tokenProperties: {
					valid: true,
					action
				},
				riskAnalysis: {
					score: 0.99,
					reasons: []
				}
			});
			return;
		}

		if (request.method === 'POST' && url.pathname === '/auth/login') {
			const body = await readJsonBody(request);
			const email = String(body?.email ?? '')
				.trim()
				.toLowerCase();
			const password = String(body?.password ?? '');

			if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
				writeJson(response, 401, {
					message: 'Invalid credentials.'
				});
				return;
			}

			writeJson(response, 200, {
				message: 'Login successful.',
				result: {
					accessToken: createJwt(),
					expires_at_datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
				}
			});
			return;
		}

		// Supabase Auth (PUBLIC_SUPABASE_URL points here): the app verifies every
		// session token (HS256, like the ones issued above) with GET /auth/v1/user.
		if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
			const claims = readMockToken(request.headers.authorization);
			if (!claims) {
				writeJson(response, 403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' });
				return;
			}

			writeJson(response, 200, {
				id: claims.sub,
				aud: 'authenticated',
				role: 'authenticated',
				email: claims.email
			});
			return;
		}

		if (request.method === 'POST' && url.pathname === '/auth/v1/logout') {
			response.writeHead(204);
			response.end();
			return;
		}

		if (request.method === 'GET' && url.pathname === '/auth/user-profile') {
			if (!request.headers.authorization?.startsWith('Bearer ')) {
				writeJson(response, 401, { message: 'Unauthorized' });
				return;
			}

			writeJson(response, 200, {
				employer: 'Playwright Farm'
			});
			return;
		}

		// Rules, their form context and the push recipients of the rule form.
		if (url.pathname === '/rules' || url.pathname.startsWith('/rules/')) {
			if (!request.headers.authorization?.startsWith('Bearer ')) {
				writeJson(response, 401, { message: 'Unauthorized' });
				return;
			}
			await handleRules(request, response, url);
			return;
		}
		if (request.method === 'GET' && url.pathname === '/push/recipients') {
			writeJson(response, 200, [
				{ userId: 'playwright-user', displayName: 'Playwright Operator', pushEnabled: true },
				{ userId: 'demo-user-aki', displayName: 'Aki Tanaka', pushEnabled: true },
				{ userId: 'demo-user-mei', displayName: 'Mei Sato', pushEnabled: false }
			]);
			return;
		}

		// Location and device groups (one in-memory list per pool, per run).
		const groupRoute = /^\/(location|device)-groups(?:\/(\d+))?$/.exec(url.pathname);
		if (groupRoute) {
			if (!request.headers.authorization?.startsWith('Bearer ')) {
				writeJson(response, 401, { message: 'Unauthorized' });
				return;
			}
			handleGroups(request, response, url, groupRoute[1], groupRoute[2]);
			return;
		}

		writeJson(response, 404, {
			message: 'Not Found',
			path: url.pathname
		});
	});
}

const groupPools = { location: [], device: [] };
let nextGroupId = 1;

/** GET (optionally ?org_id=), POST (idempotent per org and name), PATCH and DELETE /{kind}-groups. */
async function handleGroups(request, response, url, kind, rawId) {
	const pool = groupPools[kind];
	const id = rawId === undefined ? null : Number(rawId);
	const index = id === null ? -1 : pool.findIndex((group) => group.id === id);

	if (request.method === 'GET' && id === null) {
		const orgId = url.searchParams.get('org_id');
		writeJson(
			response,
			200,
			pool.filter((group) => !orgId || group.org_id === orgId)
		);
		return;
	}
	if (request.method === 'POST' && id === null) {
		const body = await readJsonBody(request);
		const name = String(body?.name ?? '').trim();
		const orgId = String(body?.org_id ?? '');
		if (!name || !orgId) {
			writeJson(response, 400, { message: 'name and org_id are required' });
			return;
		}
		let group = pool.find((existing) => existing.org_id === orgId && existing.name === name);
		if (!group) {
			group = { id: nextGroupId++, name, org_id: orgId, can_manage: true };
			pool.push(group);
		}
		writeJson(response, 201, group);
		return;
	}
	if (index === -1) {
		writeJson(response, 404, { message: 'Group not found' });
		return;
	}
	if (request.method === 'PATCH') {
		const body = await readJsonBody(request);
		const name = String(body?.name ?? '').trim();
		if (pool.some((g) => g.id !== id && g.org_id === pool[index].org_id && g.name === name)) {
			writeJson(response, 409, { message: 'This organization already has a group with this name' });
			return;
		}
		pool[index] = { ...pool[index], name };
		writeJson(response, 200, pool[index]);
		return;
	}
	if (request.method === 'DELETE') {
		pool.splice(index, 1);
		response.writeHead(204);
		response.end();
		return;
	}
	writeJson(response, 405, { message: 'Method Not Allowed' });
}

// ---------------------------------------------------------------------------
// Rules: a fictional list, in memory, one per run. It stores what the rule
// form saves and answers like the API, so the rules pages can be used by
// hand. NOTHING IS EVALUATED AND NOTHING IS SENT: no readings, no alarms, no
// Date/Time runs, no re-sends. Only start and pause dates are applied (every
// few seconds), so that a date which passes shows in the list.
// ---------------------------------------------------------------------------
const RULE_DEVICES = [
	{ dev_eui: 'A840410000000001', name: 'Greenhouse 1', location_id: 1, type: 1 },
	{ dev_eui: 'A840410000000002', name: 'Pump relay', location_id: 1, type: 2 }
];
const RULE_ACTION_TYPES = [
	{ id: 2, name: 'EMail', createdAt: '' },
	{ id: 3, name: 'LoRaWAN', createdAt: '' },
	{ id: 5, name: 'Push', createdAt: '' },
	{ id: 6, name: 'RuleActivate', createdAt: '' },
	{ id: 7, name: 'RuleDeactivate', createdAt: '' },
	{ id: 8, name: 'RuleDeactivateSelf', createdAt: '' }
];
const OPERATOR = 'Playwright Operator';
const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
let nextRuleId = 1;
let nextRulePartId = 1000;

function ruleAssignments(templateId, devEuis) {
	return devEuis.map((devEui) => ({
		id: nextRulePartId++,
		devEui,
		templateId,
		isActive: true,
		createdAt: null,
		deviceName: RULE_DEVICES.find((device) => device.dev_eui === devEui)?.name ?? null,
		locationName: 'Demo farm',
		permissionLevel: 1,
		state: null
	}));
}

function ruleCriteria(templateId, criteria) {
	return criteria.map((criterion) => ({
		id: nextRulePartId++,
		templateId,
		subject: criterion.subject,
		operator: criterion.operator,
		triggerValue: criterion.triggerValue,
		resetValue: criterion.resetValue,
		createdAt: null
	}));
}

function ruleActions(templateId, actions) {
	return actions.map((action) => ({
		id: nextRulePartId++,
		templateId,
		actionType: action.actionType,
		actionTypeName: RULE_ACTION_TYPES.find((type) => type.id === action.actionType)?.name ?? null,
		actionTypeValue: null,
		config: action.config ?? {},
		createdAt: null
	}));
}

/** The next time `timeOfDay` comes on one of `daysOfWeek` in `timezone` (close enough for a list). */
function nextRunOf(schedule, from = Date.now()) {
	const [hours, minutes] = String(schedule.timeOfDay).split(':').map(Number);
	const local = new Intl.DateTimeFormat('en-CA', {
		timeZone: schedule.timezone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
	const wallClock = (instant) => {
		const part = Object.fromEntries(local.formatToParts(instant).map((p) => [p.type, p.value]));
		return Date.UTC(+part.year, +part.month - 1, +part.day, +part.hour, +part.minute);
	};
	const today = new Date(wallClock(from));
	for (let ahead = 0; ahead <= 8; ahead += 1) {
		const wanted = Date.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate() + ahead,
			hours,
			minutes
		);
		const isoWeekday = new Date(wanted).getUTCDay() || 7;
		if (!schedule.daysOfWeek.includes(isoWeekday)) continue;
		// The zone's offset at that moment, applied twice to settle around a clock change.
		let instant = wanted - (wallClock(wanted) - wanted);
		instant = wanted - (wallClock(instant) - instant);
		if (instant > from) return new Date(instant).toISOString();
	}
	return null;
}

function newRule(fields) {
	const id = nextRuleId++;
	const kind = fields.triggerKind === 'schedule' ? 'schedule' : 'sensor';
	return {
		id,
		name: fields.name,
		description: fields.description ?? null,
		deviceTypeId: fields.deviceTypeId ?? null,
		isActive: fields.isActive ?? true,
		createdAt: new Date().toISOString(),
		autoStartAt: fields.autoStartAt ?? null,
		autoPauseAt: fields.autoPauseAt ?? null,
		onAutoPauseStartTemplateId: fields.onAutoPauseStartTemplateId ?? null,
		triggerKind: kind,
		orgId: 'playwright-org',
		schedule: kind === 'schedule' ? fields.schedule : null,
		resendAfterReports: kind === 'sensor' ? (fields.resendAfterReports ?? null) : null,
		resendMax: fields.resendMax ?? 5,
		assignments: ruleAssignments(id, fields.devEuis ?? []),
		criteria: ruleCriteria(id, fields.criteria ?? []),
		actions: ruleActions(id, fields.actions ?? []),
		// Who or what last started or paused it (not part of the answer as such).
		changed: fields.changed ?? { at: null, reason: null, byUser: null, byRule: null }
	};
}

const HEAT = { subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 28 };
const FROST = { subject: 'temperature_c', operator: '<', triggerValue: 2, resetValue: 4 };
const MAIL = { actionType: 2, config: { recipient: 'demo@example.com' } };
const SENSOR = ['A840410000000001'];
const demoRules = [
	newRule({
		name: 'Summer heat',
		devEuis: SENSOR,
		criteria: [HEAT],
		actions: [MAIL],
		autoPauseAt: inDays(4),
		onAutoPauseStartTemplateId: 3,
		changed: { at: inDays(-7), reason: 'manual', byUser: 'Aki Tanaka', byRule: null }
	}),
	newRule({
		name: 'Door open',
		devEuis: SENSOR,
		criteria: [{ subject: 'humidity', operator: '>', triggerValue: 90, resetValue: 85 }],
		actions: [MAIL],
		isActive: false,
		changed: { at: inDays(-2), reason: 'manual', byUser: 'Mei Sato', byRule: null }
	}),
	newRule({
		name: 'Winter frost',
		devEuis: SENSOR,
		criteria: [FROST],
		actions: [MAIL],
		isActive: false
	}),
	newRule({
		name: 'Harvest watch',
		devEuis: SENSOR,
		criteria: [HEAT],
		actions: [MAIL],
		isActive: false,
		autoStartAt: inDays(120),
		changed: { at: inDays(-27), reason: 'auto_pause', byUser: null, byRule: null }
	}),
	newRule({
		name: 'Cold room (sends again)',
		devEuis: SENSOR,
		criteria: [{ subject: 'temperature_c', operator: '>', triggerValue: 8, resetValue: 6 }],
		actions: [{ actionType: 2, config: { recipient: 'demo@example.com', repeat: true } }],
		resendAfterReports: 4,
		resendMax: 5
	}),
	newRule({
		name: 'Evening: night alarms on',
		triggerKind: 'schedule',
		schedule: { timeOfDay: '18:30', daysOfWeek: [1, 2, 3, 4, 5], timezone: 'Asia/Tokyo' },
		actions: [{ actionType: 6, config: { recipient: '3', targetTemplateId: 3 } }]
	})
];

const findRule = (id) => demoRules.find((rule) => rule.id === id) ?? null;
const ruleRef = (id) => {
	const rule = typeof id === 'number' ? findRule(id) : null;
	return rule ? { id: rule.id, name: rule.name } : null;
};

/** The same reading of a rule's status as the API's computeRuleStatus. */
function presentRule(rule) {
	let nextStart = null;
	if (!rule.isActive) {
		const starts = demoRules
			.filter(
				(other) =>
					other.id !== rule.id &&
					other.isActive &&
					other.autoPauseAt &&
					other.onAutoPauseStartTemplateId === rule.id
			)
			.map((other) => ({ at: other.autoPauseAt, source: 'chain', byRule: ruleRef(other.id) }));
		if (rule.autoStartAt) starts.push({ at: rule.autoStartAt, source: 'date', byRule: null });
		nextStart = starts.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0] ?? null;
	}
	const { changed, ...answer } = rule;
	return {
		...answer,
		schedule: rule.schedule
			? {
					...rule.schedule,
					nextFireAt: rule.isActive ? nextRunOf(rule.schedule) : null,
					lastFiredAt: null
				}
			: null,
		status: {
			state: rule.isActive ? 'running' : nextStart ? 'scheduled' : 'paused',
			since: changed.at ?? rule.createdAt,
			reason: changed.reason,
			byUserName: changed.byUser,
			byRule: ruleRef(changed.byRule),
			autoPauseAt: rule.isActive ? rule.autoPauseAt : null,
			thenStart:
				rule.isActive && rule.autoPauseAt ? ruleRef(rule.onAutoPauseStartTemplateId) : null,
			nextStart
		}
	};
}

function switchRule(rule, activate, reason, { at = new Date().toISOString(), byRule = null } = {}) {
	if (rule.isActive === activate) return;
	rule.isActive = activate;
	rule.changed = { at, reason, byUser: reason === 'manual' ? OPERATOR : null, byRule };
}

/** Start and pause dates that have passed: used up, in the order of their dates. */
function applyRuleDates(now = Date.now()) {
	const due = demoRules
		.flatMap((rule) => [
			{ rule, at: rule.autoStartAt, start: true },
			{ rule, at: rule.autoPauseAt, start: false }
		])
		.filter((entry) => entry.at && Date.parse(entry.at) <= now)
		.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	for (const { rule, at, start } of due) {
		if (start) {
			rule.autoStartAt = null;
			switchRule(rule, true, 'auto_start', { at });
			continue;
		}
		const then = findRule(rule.onAutoPauseStartTemplateId);
		rule.autoPauseAt = null;
		rule.onAutoPauseStartTemplateId = null;
		switchRule(rule, false, 'auto_pause', { at });
		if (then) switchRule(then, true, 'chain', { at, byRule: rule.id });
	}
}

/** A save: like the API, a field that is left out keeps its value. */
function saveRule(rule, body) {
	for (const field of ['name', 'description', 'deviceTypeId', 'resendMax']) {
		if (field in body) rule[field] = body[field];
	}
	for (const field of ['autoStartAt', 'autoPauseAt', 'onAutoPauseStartTemplateId']) {
		if (field in body) rule[field] = body[field];
	}
	if (rule.autoPauseAt === null) rule.onAutoPauseStartTemplateId = null;
	if (rule.triggerKind === 'schedule') {
		if (body.schedule) rule.schedule = body.schedule;
	} else if ('resendAfterReports' in body) {
		rule.resendAfterReports = body.resendAfterReports;
	}
	if (Array.isArray(body.devEuis)) rule.assignments = ruleAssignments(rule.id, body.devEuis);
	if (Array.isArray(body.criteria)) rule.criteria = ruleCriteria(rule.id, body.criteria);
	if (Array.isArray(body.actions)) rule.actions = ruleActions(rule.id, body.actions);
	if (typeof body.isActive === 'boolean') switchRule(rule, body.isActive, 'manual');
}

/** The rules that start or pause `id`: by an action, or after their pause date. */
function dependentsOf(id) {
	return demoRules.filter(
		(rule) =>
			rule.id !== id &&
			(rule.onAutoPauseStartTemplateId === id ||
				rule.actions.some((action) => action.config?.targetTemplateId === id))
	);
}

async function handleRules(request, response, url) {
	applyRuleDates();
	const { method } = request;
	const route =
		/^\/rules(?:\/(\d+|form-context|triggered|triggered\/count))?(?:\/(start|pause|history))?$/.exec(
			url.pathname
		);
	if (!route) {
		writeJson(response, 404, { message: 'Not Found', path: url.pathname });
		return;
	}
	const [, first, verb] = route;

	if (method === 'GET' && first === undefined) {
		const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
		writeJson(
			response,
			200,
			demoRules.filter((rule) => rule.name.toLowerCase().includes(search)).map(presentRule)
		);
		return;
	}
	if (method === 'POST' && first === undefined) {
		const rule = newRule({ ...(await readJsonBody(request)) });
		rule.changed = { at: rule.createdAt, reason: 'manual', byUser: OPERATOR, byRule: null };
		demoRules.push(rule);
		writeJson(response, 201, presentRule(rule));
		return;
	}
	if (method === 'GET' && first === 'triggered') {
		writeJson(response, 200, []);
		return;
	}
	if (method === 'GET' && first === 'triggered/count') {
		writeJson(response, 200, { count: 0, triggered_count: 0, total_count: demoRules.length });
		return;
	}
	if (method === 'GET' && first === 'form-context') {
		// A fictional manager's view: the form offers Date/Time rules and has rules to switch.
		const templateId = url.searchParams.get('templateId');
		const template = templateId === null ? null : findRule(Number(templateId));
		if (templateId !== null && !template) {
			writeJson(response, 404, { message: 'Rule template not found' });
			return;
		}
		writeJson(response, 200, {
			devices: RULE_DEVICES,
			locations: [{ location_id: 1, name: 'Demo farm', created_at: '' }],
			actionTypes: RULE_ACTION_TYPES,
			template: template ? presentRule(template) : null,
			ruleOptions: demoRules.map((rule) => ({
				id: rule.id,
				name: rule.name,
				orgId: rule.orgId,
				triggerKind: rule.triggerKind
			})),
			canManageDateTimeRules: true
		});
		return;
	}

	const rule = findRule(Number(first));
	if (!rule) {
		writeJson(response, 404, { message: 'Rule template not found' });
		return;
	}
	if (method === 'GET' && verb === 'history') {
		writeJson(response, 200, []);
		return;
	}
	if (method === 'POST' && (verb === 'start' || verb === 'pause')) {
		switchRule(rule, verb === 'start', 'manual');
		writeJson(response, 200, presentRule(rule));
		return;
	}
	if (verb !== undefined) {
		writeJson(response, 405, { message: 'Method Not Allowed' });
		return;
	}
	if (method === 'GET') {
		writeJson(response, 200, presentRule(rule));
		return;
	}
	if (method === 'PATCH' || method === 'PUT') {
		saveRule(rule, await readJsonBody(request));
		writeJson(response, 200, presentRule(rule));
		return;
	}
	if (method === 'DELETE') {
		const dependents = dependentsOf(rule.id);
		if (dependents.length > 0 && url.searchParams.get('force') !== 'true') {
			writeJson(response, 409, {
				message: 'Other rules start or pause this rule',
				dependents: dependents.map((dependent) => ({ id: dependent.id, name: dependent.name }))
			});
			return;
		}
		for (const dependent of dependents) {
			if (dependent.onAutoPauseStartTemplateId === rule.id) {
				dependent.onAutoPauseStartTemplateId = null;
			}
		}
		demoRules.splice(demoRules.indexOf(rule), 1);
		writeJson(response, 200, { id: rule.id });
		return;
	}
	writeJson(response, 405, { message: 'Method Not Allowed' });
}

function waitForExit(child) {
	return new Promise((resolve, reject) => {
		child.once('exit', (code) => resolve(code ?? 0));
		child.once('error', reject);
	});
}

async function main() {
	const mockServer = createMockServer();
	await new Promise((resolve, reject) => {
		mockServer.once('error', reject);
		mockServer.listen(MOCK_PORT, '127.0.0.1', resolve);
	});

	// Supabase's URL and key are build-time ($env/static/public) values.
	const build = spawn('npm', ['run', 'build'], {
		stdio: 'inherit',
		env: {
			...process.env,
			PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
			PUBLIC_SUPABASE_ANON_KEY: 'playwright-anon-key'
		}
	});

	const buildExitCode = await waitForExit(build);
	if (buildExitCode !== 0) {
		await new Promise((resolve) => mockServer.close(resolve));
		process.exit(buildExitCode);
	}

	const preview = spawn(
		'npm',
		['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(APP_PORT)],
		{
			stdio: 'inherit',
			env: {
				...process.env,
				PUBLIC_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
				PUBLIC_RECAPTCHA_SITE_KEY: 'playwright-site-key',
				PRIVATE_RECAPTCHA_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
				PRIVATE_RECAPTCHA_PROJECT_ID: 'playwright-project',
				PRIVATE_RECAPTCHA_API_KEY: 'playwright-api-key',
				PRIVATE_RECAPTCHA_SITE_KEY: 'playwright-site-key'
			}
		}
	);

	const shutdown = async (exitCode = 0) => {
		if (!preview.killed) {
			preview.kill('SIGTERM');
		}

		await new Promise((resolve) => mockServer.close(resolve));
		process.exit(exitCode);
	};

	process.on('SIGINT', () => void shutdown(130));
	process.on('SIGTERM', () => void shutdown(143));

	preview.once('exit', async (code) => {
		await new Promise((resolve) => mockServer.close(resolve));
		process.exit(code ?? 0);
	});
}

void main().catch((error) => {
	console.error('Failed to start the Playwright E2E stack:', error);
	process.exit(1);
});
