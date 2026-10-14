import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Guards the eslint.config.js rule that keeps user data out of Leaflet's
// innerHTML sinks (CVE-2025-69993). If the rule is removed or loosened, this
// test fails.
const eslint = new ESLint();

async function leafletXssErrors(code: string): Promise<number> {
	const [result] = await eslint.lintText(code, { filePath: 'src/lib/maps/example.ts' });
	return result.messages.filter(
		(message) => message.ruleId === 'no-restricted-syntax' && message.message.includes('XSS')
	).length;
}

const PREAMBLE = `
import { plainText } from '$lib/maps/leaflet-content';
declare const L: { divIcon: (options: { html: string }) => unknown };
declare const layer: {
	bindTooltip: (content: unknown) => void;
	bindPopup: (content: unknown) => void;
	setContent: (content: unknown) => void;
};
declare const name: string;
`;

describe('Leaflet XSS lint rule', () => {
	it('rejects strings passed to Leaflet content methods', async () => {
		expect(await leafletXssErrors(`${PREAMBLE}layer.bindTooltip(name);`)).toBe(1);
		expect(await leafletXssErrors(`${PREAMBLE}layer.bindPopup(\`<b>\${name}</b>\`);`)).toBe(1);
		expect(await leafletXssErrors(`${PREAMBLE}layer.setContent('<b>x</b>');`)).toBe(1);
	});

	it('rejects data in divIcon html', async () => {
		expect(await leafletXssErrors(`${PREAMBLE}L.divIcon({ html: \`<i>\${name}</i>\` });`)).toBe(1);
	});

	it('allows plainText() content and constant divIcon html', async () => {
		expect(await leafletXssErrors(`${PREAMBLE}layer.bindTooltip(plainText(name));`)).toBe(0);
		expect(await leafletXssErrors(`${PREAMBLE}L.divIcon({ html: '<span></span>' });`)).toBe(0);
	});
});
