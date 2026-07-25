// Generates src/lib/paraglide/ outside of a vite build.
//
// src/lib/paraglide is gitignored and normally produced as a side effect of the
// paraglide vite plugin (`pnpm dev` / `pnpm build`). `svelte-check` does not run
// vite, so without this step every `import { m } from '$lib/paraglide/messages.js'`
// fails to resolve on a fresh checkout — which is exactly what CI is.
//
// Uses the JS API rather than the `paraglide-js compile` CLI: the CLI has no
// output-structure flag and would silently revert to message-modules.
import { compile } from '@inlang/paraglide-js';
import { paraglideConfig } from '../paraglide.config.js';

await compile(paraglideConfig);
