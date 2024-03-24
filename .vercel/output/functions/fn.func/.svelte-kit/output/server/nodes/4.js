

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/about/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.BoW0Pe7P.js","_app/immutable/chunks/scheduler.DJbgeZ86.js","_app/immutable/chunks/index.NvtDNA1J.js"];
export const stylesheets = [];
export const fonts = [];
