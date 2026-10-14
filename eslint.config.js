import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			// Leaflet renders string popup/tooltip content and divIcon `html` with
			// innerHTML (CVE-2025-69993, no fixed release). User data must reach it
			// as a DOM node via plainText() from $lib/maps/leaflet-content.
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'CallExpression[callee.property.name=/^(bindPopup|bindTooltip|setContent)$/][arguments.length>0]:not([arguments.0.callee.name="plainText"])',
					message:
						'Leaflet inserts string content as raw HTML (XSS). Pass plainText(text) from $lib/maps/leaflet-content instead.'
				},
				{
					selector:
						'CallExpression[callee.property.name="divIcon"] Property[key.name="html"]:not([value.type="Literal"])',
					message:
						'Leaflet inserts divIcon html as raw HTML (XSS). Use a fixed string literal, never data.'
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	}
);
