export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["cantrell.js","favicon.png","overcastSky.jpg","sunnySky.jpg"]),
	mimeTypes: {".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg"},
	_: {
		client: {"start":"_app/immutable/entry/start.BYc1lItu.js","app":"_app/immutable/entry/app.B_EjUHvW.js","imports":["_app/immutable/entry/start.BYc1lItu.js","_app/immutable/chunks/entry.SFY_cZ30.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/index.IvLLdXYq.js","_app/immutable/entry/app.B_EjUHvW.js","_app/immutable/chunks/15.edQw-CpS.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/index.NvtDNA1J.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js')),
			__memo(() => import('../output/server/nodes/5.js')),
			__memo(() => import('../output/server/nodes/6.js')),
			__memo(() => import('../output/server/nodes/7.js')),
			__memo(() => import('../output/server/nodes/8.js')),
			__memo(() => import('../output/server/nodes/9.js')),
			__memo(() => import('../output/server/nodes/10.js')),
			__memo(() => import('../output/server/nodes/11.js')),
			__memo(() => import('../output/server/nodes/12.js')),
			__memo(() => import('../output/server/nodes/13.js')),
			__memo(() => import('../output/server/nodes/14.js')),
			__memo(() => import('../output/server/nodes/15.js')),
			__memo(() => import('../output/server/nodes/16.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/api/add-device",
				pattern: /^\/api\/add-device\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/add-device/_server.ts.js'))
			},
			{
				id: "/api/device-table",
				pattern: /^\/api\/device-table\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/device-table/_server.ts.js'))
			},
			{
				id: "/app/dashboard",
				pattern: /^\/app\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/app/devices",
				pattern: /^\/app\/devices\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/app/locations",
				pattern: /^\/app\/locations\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/app/locations/[location_id]",
				pattern: /^\/app\/locations\/([^/]+?)\/?$/,
				params: [{"name":"location_id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/app/locations/[location_id]/device-type/CO2-Sensor/[sensor_eui]",
				pattern: /^\/app\/locations\/([^/]+?)\/device-type\/CO2-Sensor\/([^/]+?)\/?$/,
				params: [{"name":"location_id","optional":false,"rest":false,"chained":false},{"name":"sensor_eui","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/app/locations/[location_id]/device-type/CW-Pulse/[sensor_eui]",
				pattern: /^\/app\/locations\/([^/]+?)\/device-type\/CW-Pulse\/([^/]+?)\/?$/,
				params: [{"name":"location_id","optional":false,"rest":false,"chained":false},{"name":"sensor_eui","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/app/locations/[location_id]/device-type/CW-SS-TMEPNPK/[sensor_eui]",
				pattern: /^\/app\/locations\/([^/]+?)\/device-type\/CW-SS-TMEPNPK\/([^/]+?)\/?$/,
				params: [{"name":"location_id","optional":false,"rest":false,"chained":false},{"name":"sensor_eui","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/app/settings",
				pattern: /^\/app\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/auth/callback",
				pattern: /^\/auth\/callback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/auth/callback/_server.ts.js'))
			},
			{
				id: "/auth/forgot-password",
				pattern: /^\/auth\/forgot-password\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/auth/login",
				pattern: /^\/auth\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/auth/logout",
				pattern: /^\/auth\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/auth/register",
				pattern: /^\/auth\/register\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
