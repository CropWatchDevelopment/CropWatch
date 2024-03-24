import * as universal from '../entries/pages/_layout.ts.js';
import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.1u-ATZMq.js","_app/immutable/chunks/index.Dt_pjQkU.js","_app/immutable/chunks/15.edQw-CpS.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/index.NvtDNA1J.js","_app/immutable/chunks/theme.BK28Fqn0.js","_app/immutable/chunks/index.IvLLdXYq.js","_app/immutable/chunks/auth.store.MJk1P8pJ.js","_app/immutable/chunks/entry.SFY_cZ30.js"];
export const stylesheets = ["_app/immutable/assets/0.CJA0feR6.css","_app/immutable/assets/theme.lcnFt0Zs.css"];
export const fonts = [];
