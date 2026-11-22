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
