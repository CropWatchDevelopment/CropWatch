// Captures the web manifest's `screenshots` (static/screenshots/pwa/<locale>/),
// which Chrome on Android shows in its larger install sheet: the dashboard
// (cards on a phone, the table on a desktop) and the overview, in Japanese and
// English. Re-run after a visible change to those pages:
//
//   node scripts/e2e-stack.mjs                 # first, in another terminal: builds, then serves :4173
//   node scripts/capture-pwa-screenshots.mjs
//
// Wait for the stack's "Local: http://127.0.0.1:4173/" line, and stop it
// (Ctrl+C) when the screenshots are written.
//
// Everything on screen is the fictional farm below (TEXT, DEVICES); nothing
// talks to a real API. The stack runs the built app against its local mock
// API, which only knows sign-in, and this script signs in through the real
// login form and answers every call the browser makes to that API from the
// demo data. Two things come from the server instead, so they get the same
// treatment: the mock's account names in the served pages are swapped for the
// demo farm's, and the overview, which the server cannot load from the mock,
// is fetched by its own "Try again" button. Every other request leaving the
// machine is blocked. The browser's clock is pinned to each locale's `at`, so
// a re-run only changes the images where the UI changed.
//
// File names and sizes must match SCREENSHOTS in src/lib/pwa/manifest.ts.
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = `${root}static/screenshots/pwa`;
const APP = 'http://127.0.0.1:4173';
const API = 'http://127.0.0.1:4174'; // the app's PUBLIC_API_BASE_URL in the e2e stack

// The e2e mock's only account (scripts/e2e-stack.mjs), and what it calls it.
const LOGIN = { email: 'operator@cropwatch.test', password: 'CorrectHorseBatteryStaple1!' };
const MOCK_EMPLOYER = 'Playwright Farm';
const MOCK_FULL_NAME = 'Playwright Operator';

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false };

const SHOTS = [
	{ name: 'dashboard-narrow', device: PHONE, path: '/', view: 'cards' },
	{ name: 'overview-narrow', device: PHONE, path: '/overview' },
	{ name: 'dashboard-wide', device: DESKTOP, path: '/', view: 'table' }
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ── Demo farm ────────────────────────────────────────────────────────────────

const DEVICE_TYPES = {
	air: {
		id: 1,
		name: 'Air',
		data_table_v2: 'cw_air_data',
		primary_data_v2: 'temperature_c',
		secondary_data_v2: 'humidity',
		default_upload_interval: 10
	},
	co2: {
		id: 2,
		name: 'CO2',
		data_table_v2: 'cw_air_data',
		primary_data_v2: 'co2',
		secondary_data_v2: 'temperature_c',
		default_upload_interval: 10
	},
	soil: {
		id: 3,
		name: 'Soil',
		data_table_v2: 'cw_soil_data',
		primary_data_v2: 'moisture',
		secondary_data_v2: 'ec',
		default_upload_interval: 20
	}
};

const TEXT = {
	ja: {
		timezoneId: 'Asia/Tokyo',
		intlLocale: 'ja-JP',
		at: '2026-10-21T10:24:00+09:00',
		farm: 'みどり野ファーム',
		person: '佐藤 葵',
		email: 'aoi.sato@example.jp',
		locations: { gh1: '第1ハウス', field: '露地畑 北区画', cold: '出荷前冷蔵庫', gh2: '第2ハウス' },
		locationGroups: { gh1: 'ハウス', field: '露地', cold: '冷蔵', gh2: 'ハウス' },
		deviceGroups: { climate: '環境', soil: '土壌', cold: '温度管理' },
		devices: {
			gh1Air: 'ハウス1 温湿度',
			gh1Co2: 'ハウス1 CO2',
			gh1Soil: 'ハウス1 土壌',
			fieldSoilA: '北区画 土壌A',
			fieldSoilB: '北区画 土壌B',
			fieldSoilC: '北区画 土壌C',
			cold1: '冷蔵庫1 温湿度',
			cold2: '冷蔵庫2 温湿度',
			gh2Air: 'ハウス2 温湿度',
			gh2Soil: 'ハウス2 土壌'
		},
		rules: { coldHigh: '冷蔵庫 5℃超過', co2Low: 'ハウス CO2不足' },
		notes: [
			{ title: '3〜5列目に潅水', note: '午前中に約20分。土壌水分の戻りを確認する。' },
			{ title: '冷蔵庫1 扉パッキン点検', note: '業者の点検は木曜の予定。' }
		]
	},
	en: {
		timezoneId: 'America/Los_Angeles',
		intlLocale: 'en-US',
		at: '2026-10-21T10:24:00-07:00',
		farm: 'Willow Creek Farm',
		person: 'Emma Hayes',
		email: 'emma.hayes@example.com',
		locations: {
			gh1: 'Greenhouse 1',
			field: 'North Field',
			cold: 'Cold Storage',
			gh2: 'Greenhouse 2'
		},
		locationGroups: { gh1: 'Greenhouses', field: 'Fields', cold: 'Storage', gh2: 'Greenhouses' },
		deviceGroups: { climate: 'Climate', soil: 'Soil', cold: 'Cold chain' },
		devices: {
			gh1Air: 'GH1 Climate',
			gh1Co2: 'GH1 CO2',
			gh1Soil: 'GH1 Soil',
			fieldSoilA: 'North Soil A',
			fieldSoilB: 'North Soil B',
			fieldSoilC: 'North Soil C',
			cold1: 'Cold Room 1',
			cold2: 'Cold Room 2',
			gh2Air: 'GH2 Climate',
			gh2Soil: 'GH2 Soil'
		},
		rules: { coldHigh: 'Cold room above 5 °C', co2Low: 'Greenhouse CO2 low' },
		notes: [
			{
				title: 'Watered rows 3–5',
				note: 'About 20 minutes this morning. Check soil moisture recovers.'
			},
			{ title: 'Cold Room 1 door seal', note: 'Technician visit booked for Thursday.' }
		]
	}
};

const LOCATIONS = [
	{ key: 'gh1', location_id: 101 },
	{ key: 'field', location_id: 102 },
	{ key: 'cold', location_id: 103 },
	{ key: 'gh2', location_id: 104 }
];

// `seenAgo`: minutes since the last uplink. North Soil B went quiet three hours
// ago (offline), and Cold Room 1 is warm (the one active alert).
const DEVICES = [
	{
		key: 'gh1Air',
		location: 'gh1',
		type: 'air',
		group: 'climate',
		seenAgo: 2,
		reading: { temperature_c: 24.6, humidity: 68.2, dew_point: 18.3 }
	},
	{
		key: 'gh1Co2',
		location: 'gh1',
		type: 'co2',
		group: 'climate',
		seenAgo: 4,
		reading: { co2: 812, temperature_c: 24.3, humidity: 66.9 }
	},
	{
		key: 'gh1Soil',
		location: 'gh1',
		type: 'soil',
		group: 'soil',
		seenAgo: 7,
		reading: { moisture: 41.8, ec: 1.12, temperature_c: 21.4 }
	},
	{
		key: 'fieldSoilA',
		location: 'field',
		type: 'soil',
		group: 'soil',
		seenAgo: 11,
		reading: { moisture: 31.4, ec: 0.86, temperature_c: 17.9 }
	},
	{
		key: 'fieldSoilB',
		location: 'field',
		type: 'soil',
		group: 'soil',
		seenAgo: 196,
		reading: { moisture: 27.9, ec: 0.74, temperature_c: 18.6 }
	},
	{
		key: 'fieldSoilC',
		location: 'field',
		type: 'soil',
		group: 'soil',
		seenAgo: 14,
		reading: { moisture: 34.7, ec: 0.91, temperature_c: 18.2 }
	},
	{
		key: 'cold1',
		location: 'cold',
		type: 'air',
		group: 'cold',
		seenAgo: 1,
		reading: { temperature_c: 6.4, humidity: 89.1, dew_point: 4.7 }
	},
	{
		key: 'cold2',
		location: 'cold',
		type: 'air',
		group: 'cold',
		seenAgo: 3,
		reading: { temperature_c: 3.1, humidity: 86.4, dew_point: 1.0 }
	},
	{
		key: 'gh2Air',
		location: 'gh2',
		type: 'air',
		group: 'climate',
		seenAgo: 5,
		reading: { temperature_c: 26.1, humidity: 61.5, dew_point: 18.0 }
	},
	{
		key: 'gh2Soil',
		location: 'gh2',
		type: 'soil',
		group: 'soil',
		seenAgo: 9,
		reading: { moisture: 44.6, ec: 1.31, temperature_c: 22.8 }
	}
];

const devEuiOf = (index) => `DE5A00000000${String(index + 1).padStart(4, '0')}`;

/** A `YYYY_MM_DD` calendar date, as report file names use. */
const fileDate = (ms) => new Date(ms).toISOString().slice(0, 10).replaceAll('-', '_');

/** The API's answers for one locale, at its fixed moment `TEXT[locale].at`. */
function buildDemo(locale) {
	const text = TEXT[locale];
	const now = Date.parse(text.at);
	const iso = (ms) => new Date(ms).toISOString();

	const locations = LOCATIONS.map(({ key, location_id }) => ({
		key,
		location_id,
		name: text.locations[key],
		group: text.locationGroups[key]
	}));
	const locationOf = (key) => locations.find((location) => location.key === key);

	const rows = DEVICES.map((device, index) => {
		const type = DEVICE_TYPES[device.type];
		const seenAt = iso(now - device.seenAgo * MINUTE - 17_000);
		const { location_id, name, group } = locationOf(device.location);
		return {
			dev_eui: devEuiOf(index),
			name: text.devices[device.key],
			group: text.deviceGroups[device.group],
			upload_interval: type.default_upload_interval,
			last_data_updated_at: seenAt,
			error_status: null,
			device_type: type,
			location: { location_id, name, group },
			latest: {
				created_at: seenAt,
				primary: device.reading[type.primary_data_v2] ?? null,
				secondary: device.reading[type.secondary_data_v2] ?? null
			}
		};
	});
	const latestByEui = new Map(
		DEVICES.map((device, index) => [
			devEuiOf(index),
			{ created_at: rows[index].last_data_updated_at, ...device.reading }
		])
	);
	const rowOf = (key) => rows[DEVICES.findIndex((device) => device.key === key)];
	const ref = (key) => {
		const row = rowOf(key);
		return {
			devEui: row.dev_eui,
			deviceName: row.name,
			locationId: row.location.location_id,
			locationName: row.location.name
		};
	};

	const online = DEVICES.filter((device) => device.seenAgo < 60).length;
	const hourStart = Math.floor(now / HOUR) * HOUR;
	const offlineSince = now - DEVICES.find((d) => d.key === 'fieldSoilB').seenAgo * MINUTE;
	const today = Math.floor(now / DAY) * DAY; // UTC midnight
	// The weekly reports went out two days ago, covering the week before.
	const reportAt = today - 2 * DAY + 8 * HOUR;
	const reportFile = `${fileDate(today - 8 * DAY)}-${fileDate(today - 2 * DAY)}.pdf`;

	const perDay = DEVICES.reduce(
		(sum, d) => sum + DAY / (DEVICE_TYPES[d.type].default_upload_interval * MINUTE),
		0
	);
	const perHour = perDay / 24;

	const overview = (range) => {
		const scale = { '24h': 1, '7d': 7, '30d': 30 }[range] ?? 1;
		const expected = perDay * scale;
		return {
			range,
			generatedAt: iso(now - 2 * MINUTE),
			since: iso(now - scale * DAY),
			devices: {
				total: rows.length,
				online,
				offline: rows.length - online,
				lastDataAt: iso(now - 40_000),
				locationCount: locations.length
			},
			gateways: { total: 2, online: 2 },
			alerts: {
				count: 3 * scale,
				previousCount: 5 * scale,
				active: 1,
				topDevices: [
					{ ...ref('cold1'), count: 2 * scale },
					{ ...ref('gh1Co2'), count: scale }
				]
			},
			reports: {
				count: Math.max(1, Math.round(scale / 7)) * 2,
				lastAt: iso(reportAt + 4 * MINUTE),
				recent: [
					{ ...ref('gh1Air'), file: reportFile, createdAt: iso(reportAt + 4 * MINUTE) },
					{ ...ref('cold1'), file: reportFile, createdAt: iso(reportAt) }
				]
			},
			uplinks: {
				count: Math.round(expected * 0.978),
				delivered: Math.round(expected * 0.978),
				expected
			},
			hourly: Array.from({ length: 24 }, (_, i) => {
				const hour = hourStart - (24 - i) * HOUR;
				return { hour: iso(hour), reporting: hour + HOUR <= offlineSince ? rows.length : online };
			}),
			locations: locations.map(({ location_id, name, key }) => {
				const here = DEVICES.filter((device) => device.location === key);
				return {
					locationId: location_id,
					name,
					total: here.length,
					online: here.filter((device) => device.seenAgo < 60).length,
					alerts: key === 'cold' ? 1 : 0
				};
			}),
			types: [
				{ dataTable: 'cw_air_data', total: DEVICES.filter((d) => d.type !== 'soil').length },
				{ dataTable: 'cw_soil_data', total: DEVICES.filter((d) => d.type === 'soil').length }
			],
			notes: text.notes.map((note, i) => ({
				id: 900 + i,
				...ref(i === 0 ? 'gh1Soil' : 'cold1'),
				title: note.title,
				note: note.note,
				author: text.person,
				authorIsStaff: false,
				createdAt: iso(now - (i === 0 ? 3 * HOUR + 12 * MINUTE : 26 * HOUR))
			})),
			feed: {
				counts: { alert: 3 * scale, device: scale, report: 2, data: 2 * scale },
				items: [
					{
						kind: 'alert_triggered',
						at: iso(now - 38 * MINUTE),
						...ref('cold1'),
						ruleName: text.rules.coldHigh
					},
					{
						kind: 'data_hour',
						at: iso(hourStart - HOUR),
						reporting: online,
						total: rows.length,
						uplinks: Math.round(perHour) - 3
					},
					{
						kind: 'device_offline',
						at: iso(offlineSince + 40 * MINUTE),
						...ref('fieldSoilB'),
						lastSeenAt: iso(offlineSince)
					},
					{
						kind: 'alert_resolved',
						at: iso(now - 5 * HOUR - 8 * MINUTE),
						...ref('gh1Co2'),
						ruleName: text.rules.co2Low,
						triggeredAt: iso(now - 6 * HOUR - 41 * MINUTE)
					},
					{
						kind: 'data_day',
						at: iso(today - DAY),
						reporting: rows.length,
						total: rows.length,
						uplinks: perDay - 2
					},
					{
						kind: 'report',
						at: iso(reportAt),
						...ref('cold1'),
						file: reportFile
					}
				]
			},
			attention: {
				offline: [
					{
						locationId: locationOf('field').location_id,
						name: locationOf('field').name,
						count: rows.length - online
					}
				],
				activeAlerts: [
					{ locationId: locationOf('cold').location_id, name: locationOf('cold').name, count: 1 }
				]
			}
		};
	};

	return { now, text, rows, latestByEui, locations, overview };
}

// ── Routing ──────────────────────────────────────────────────────────────────

const CORS = {
	'access-control-allow-origin': APP,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, accept',
	'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

// The page's reCAPTCHA Enterprise script; the stack's mock accepts any token.
const RECAPTCHA_STUB = `window.grecaptcha = { enterprise: {
	ready(callback) { setTimeout(callback, 0); },
	execute(_siteKey, { action }) { return Promise.resolve(action.toLowerCase() + '-token-' + Date.now()); }
} };`;

/** Matches the dashboard endpoints' filters (DashboardQuery). */
function filterRows(rows, query) {
	const name = query.get('name')?.toLowerCase();
	return rows.filter(
		(row) =>
			(!name || row.name.toLowerCase().includes(name)) &&
			(!query.get('group') || row.group === query.get('group')) &&
			(!query.get('location') || String(row.location.location_id) === query.get('location')) &&
			(!query.get('locationGroup') || row.location.group === query.get('locationGroup'))
	);
}

/** The demo API: what the browser asks http://127.0.0.1:4174 for. */
function answerApi(demo, method, url) {
	const path = url.pathname;
	const query = url.searchParams;
	const skip = Number(query.get('skip') ?? 0);
	const take = Number(query.get('take') ?? 25);

	if (method === 'GET' && path === '/dashboard/devices') {
		const rows = filterRows(demo.rows, query);
		return { rows: rows.slice(skip, skip + take), total: rows.length, skip, take };
	}
	if (method === 'GET' && path === '/dashboard/locations') {
		const rows = filterRows(demo.rows, query);
		const groups = demo.locations
			.map(({ location_id, name, group }) => ({
				key: String(location_id),
				location: { location_id, name, group },
				devices: rows.filter((row) => row.location.location_id === location_id)
			}))
			.filter((group) => group.devices.length > 0);
		return { groups: groups.slice(skip, skip + take), total: groups.length, skip, take };
	}
	const latest = /^\/dashboard\/devices\/([^/]+)\/latest$/.exec(path);
	if (method === 'GET' && latest) return demo.latestByEui.get(latest[1]) ?? null;
	if (method === 'GET' && path === '/overview') return demo.overview(query.get('range') ?? '24h');
	if (method === 'GET' && path === '/locations') {
		return demo.locations.map(({ location_id, name, group }) => ({
			location_id,
			name,
			group,
			created_at: '2025-04-01T00:00:00.000Z'
		}));
	}
	if (method === 'GET' && path === '/locations/groups') {
		return demo.locations.map((location) => location.group);
	}
	if (method === 'GET' && path === '/auth/whats-new') {
		return { current_release: 1, seen_release: 1, show: false };
	}
	return undefined;
}

/**
 * A served page with the mock's account names swapped for the demo farm's, and
 * the session's expiry moved to an hour after the page's fixed clock (the
 * sidebar counts down to it).
 */
function patchPage(html, demo) {
	const { text } = demo;
	return html
		.replace(/(session:\{[^{}]*?\bexp:)\d+/, `$1${Math.floor(demo.now / 1000) + 60 * 60}`)
		.replace(
			`profile:{employer:${JSON.stringify(MOCK_EMPLOYER)}}`,
			`profile:{employer:${JSON.stringify(text.farm)},full_name:${JSON.stringify(text.person)}}`
		)
		.replaceAll(MOCK_EMPLOYER, text.farm)
		.replaceAll(MOCK_FULL_NAME, text.person)
		.replace(`email:${JSON.stringify(LOGIN.email)}`, `email:${JSON.stringify(text.email)}`)
		.replaceAll(LOGIN.email, text.person); // the header shows the name where it showed the email
}

async function routeEverything(context, demo, unmocked) {
	await context.route('**/*', async (route) => {
		const request = route.request();
		const url = new URL(request.url());

		if (url.origin === API) {
			if (url.pathname.startsWith('/auth/v1/')) return route.fallback(); // Supabase: the stack's mock
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
			let body = answerApi(demo, request.method(), url);
			if (body === undefined) {
				unmocked.add(`${request.method()} ${url.pathname}`);
				body = request.method() === 'GET' ? null : {};
			}
			return route.fulfill({
				status: 200,
				headers: CORS,
				contentType: 'application/json',
				body: JSON.stringify(body)
			});
		}

		if (url.origin === APP) {
			if (request.method() !== 'GET' || request.resourceType() !== 'document')
				return route.fallback();
			const response = await route.fetch();
			const headers = { ...response.headers() };
			delete headers['content-length'];
			delete headers['content-encoding'];
			return route.fulfill({
				status: response.status(),
				headers,
				body: patchPage(await response.text(), demo)
			});
		}

		if (url.href.startsWith('https://www.google.com/recaptcha/')) {
			return route.fulfill({ contentType: 'application/javascript', body: RECAPTCHA_STUB });
		}

		// Firebase, analytics, map tiles…: nothing leaves the machine.
		return route.abort('blockedbyclient');
	});
}

// ── Capture ──────────────────────────────────────────────────────────────────

async function signIn(page) {
	await page.goto(`${APP}/auth/login`);
	await page.locator('input[name="email"]').fill(LOGIN.email);
	await page.locator('input[name="password"]').fill(LOGIN.password);
	const submit = page.locator('button[type="submit"]');
	await submit.waitFor({ state: 'visible' });
	await page.waitForFunction((el) => !el.disabled, await submit.elementHandle());
	await submit.click();
	await page.waitForURL(`${APP}/`);
}

/** Everything settled: no spinner, skeleton or busy region, fonts and images loaded. */
async function settle(page) {
	await page.waitForFunction(
		() =>
			!document.querySelector(
				'.cw-spinner, [class*="skeleton"], [aria-busy="true"], .dashboard-cards__loading'
			) && [...document.images].every((image) => image.complete)
	);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(600); // transitions (opacity, chart draw-in)
}

async function capture(browser, locale, device, shots) {
	const demo = buildDemo(locale);
	const context = await browser.newContext({
		...device,
		hasTouch: device.isMobile,
		locale: demo.text.intlLocale,
		timezoneId: demo.text.timezoneId,
		colorScheme: 'dark', // matches the manifest's background_color / theme_color
		reducedMotion: 'reduce',
		serviceWorkers: 'block' // the worker would fetch past the routes below
	});
	await context.addCookies([{ name: 'PARAGLIDE_LOCALE', value: locale, url: APP }]);
	// Every "updated 2m ago" and timestamp reads the same on every run.
	await context.clock.setFixedTime(demo.now);
	const unmocked = new Set();
	await routeEverything(context, demo, unmocked);

	try {
		const page = await context.newPage();
		await signIn(page);

		// Parks the pointer on the header's empty middle, so no row or card under
		// the last click renders hovered (or fading out of it).
		const parkPointer = () => page.mouse.move(device.viewport.width / 2, 2);

		for (const shot of shots) {
			await parkPointer();
			if (shot.view) {
				await page.evaluate(
					(view) => localStorage.setItem('cropwatch.dashboard.view', view),
					shot.view
				);
			}
			await page.goto(`${APP}${shot.path}`);

			if (shot.path === '/overview') {
				// The server could not load it from the stack's mock; the page's own retry fetches it.
				await page.locator('.ov').getByRole('button').first().click();
				await parkPointer();
				await page.locator('.kpis').waitFor();
			} else if (shot.view === 'cards') {
				await page.locator('.dashboard-cards__groups').waitFor();
			} else {
				await page.getByText(demo.rows[0].name, { exact: true }).first().waitFor();
			}
			await settle(page);

			const path = `${OUT_DIR}/${locale}/${shot.name}.png`;
			await page.screenshot({ path });
			console.log(`  ${locale}/${shot.name}.png  ${Math.round((await stat(path)).size / 1024)} KB`);
		}
	} finally {
		await context.close();
	}
	if (unmocked.size > 0) console.log(`  (answered with empty JSON: ${[...unmocked].join(', ')})`);
}

try {
	await fetch(`${APP}/auth/login`);
} catch {
	console.error(`Nothing on ${APP}. Start the e2e stack first: node scripts/e2e-stack.mjs`);
	process.exit(1);
}

const browser = await chromium.launch();
try {
	for (const locale of Object.keys(TEXT)) {
		await mkdir(`${OUT_DIR}/${locale}`, { recursive: true });
		for (const device of [PHONE, DESKTOP]) {
			const shots = SHOTS.filter((shot) => shot.device === device);
			await capture(browser, locale, device, shots);
		}
	}
} finally {
	await browser.close();
}

console.log('Wrote the PWA screenshots to static/screenshots/pwa/');
