// Shared Paraglide compiler options.
//
// Imported by BOTH vite.config.ts (dev/build) and scripts/generate-paraglide.mjs
// (the standalone generate step used by `pnpm check` and CI) so the two can never
// drift apart.
//
// outputStructure: 'locale-modules' emits ONE module per locale (~3 files) instead
// of the default 'message-modules' (one file per message — ~1,200+). In vite dev
// each module is a separate request; per-message output floods the dev server with
// thousands of pending requests and can wedge it.
//
// NOTE: the standalone `paraglide-js compile` CLI has no output-structure flag and
// always reverts to message-modules. Never use it — use the JS API via
// scripts/generate-paraglide.mjs instead.
export const paraglideConfig = {
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	// const assertion: without it this widens to `string` and fails to match the
	// compiler's `'locale-modules' | 'message-modules'` union. The option type is
	// not re-exported from the package entry, so annotate the literal instead.
	outputStructure: /** @type {const} */ ('locale-modules')
};
