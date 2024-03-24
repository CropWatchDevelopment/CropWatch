import * as server from '../entries/pages/app/dashboard/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/app/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.BFyhyodP.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/await_block.Bye-b-4s.js","_app/immutable/chunks/index.NvtDNA1J.js","_app/immutable/chunks/Button.B7o3zPwS.js","_app/immutable/chunks/theme.BK28Fqn0.js","_app/immutable/chunks/index.IvLLdXYq.js","_app/immutable/chunks/Overlay.Dd6yhJEj.js","_app/immutable/chunks/Card.D1WqUfoA.js","_app/immutable/chunks/Breadcrumb.KrpsHh7n.js","_app/immutable/chunks/MenuItem.CoYq7dh2.js","_app/immutable/chunks/focus.D-irkpyK.js","_app/immutable/chunks/Popover.Dt9IO2bq.js","_app/immutable/chunks/CWStatCard.C_OgeWNT.js","_app/immutable/chunks/Duration.rWvrTW6q.js","_app/immutable/chunks/Toggle.CvmAPVJZ.js","_app/immutable/chunks/ticks.CRxbk5SC.js","_app/immutable/chunks/moment.Cl4UOzQZ.js","_app/immutable/chunks/feedback.store.fIoWk-fH.js","_app/immutable/chunks/CWTable.c7YOlsJQ.js","_app/immutable/chunks/entry.SFY_cZ30.js","_app/immutable/chunks/DeviceTypeToName.9Q5WcYV-.js","_app/immutable/chunks/Tooltip.LeEdhWkU.js"];
export const stylesheets = ["_app/immutable/assets/5.CxhQBURu.css","_app/immutable/assets/theme.lcnFt0Zs.css","_app/immutable/assets/ticks.CwoNvddV.css","_app/immutable/assets/CWTable.DgU4j-nR.css"];
export const fonts = [];
