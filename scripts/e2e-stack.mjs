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

		writeJson(response, 404, {
			message: 'Not Found',
			path: url.pathname
		});
	});
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

	const build = spawn('npm', ['run', 'build'], {
		stdio: 'inherit',
		env: process.env
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
