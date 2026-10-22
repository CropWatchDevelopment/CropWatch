import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Guards the eslint.config.js rule that keeps user data out of MapLibre's
// HTML sink (Popup.setHTML). If the rule is removed or loosened, this fails.
const eslint = new ESLint();

async function setHtmlErrors(code: string): Promise<number> {
	const [result] = await eslint.lintText(code, { filePath: 'src/lib/example-map.ts' });
	return result.messages.filter(
		(message) => message.ruleId === 'no-restricted-syntax' && message.message.includes('XSS')
	).length;
}

const PREAMBLE = `
declare const popup: { setHTML: (html: string) => void; setText: (text: string) => void };
declare const name: string;
`;

// The first lint loads the whole ESLint config (typescript-eslint, svelte), which
// can take several seconds on a busy machine.
describe('map popup HTML lint rule', { timeout: 30_000 }, () => {
	it('rejects setHTML, whatever it is given', async () => {
		expect(await setHtmlErrors(`${PREAMBLE}popup.setHTML(name);`)).toBe(1);
		expect(await setHtmlErrors(`${PREAMBLE}popup.setHTML(\`<b>\${name}</b>\`);`)).toBe(1);
		expect(await setHtmlErrors(`${PREAMBLE}popup.setHTML('<b>x</b>');`)).toBe(1);
	});

	it('allows setText', async () => {
		expect(await setHtmlErrors(`${PREAMBLE}popup.setText(name);`)).toBe(0);
	});
});
