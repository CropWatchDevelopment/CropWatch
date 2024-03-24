

export const index = 16;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/auth/register/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/16.Cz9mDdbG.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/index.NvtDNA1J.js"];
export const stylesheets = [];
export const fonts = [];
