import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const rootDir = process.cwd();
const sourceDir = join(rootDir, 'src');
const allowedExtensions = new Set(['.svelte', '.css', '.ts', '.js']);
const allowedBreakpoints = new Set(['639', '640', '767', '768', '1023', '1024']);
const legacyAllowlist = [
	/^src\/lib\/components\/dashboard\//,
	/^src\/lib\/components\/displays\//,
	/^src\/lib\/components\/status\//,
	/^src\/lib\/pwa\/manifest\.ts$/,
	/^src\/routes\/auth\//,
	/^src\/routes\/demo\//,
	/^src\/routes\/locations\//,
	/^src\/routes\/offline\//
];

const findings = [];

function isAllowlisted(filePath) {
	return legacyAllowlist.some((pattern) => pattern.test(filePath));
}

function collectFiles(directory) {
	const files = [];

	for (const entry of readdirSync(directory)) {
		const absolutePath = join(directory, entry);
		const stats = statSync(absolutePath);

		if (stats.isDirectory()) {
			files.push(...collectFiles(absolutePath));
			continue;
		}

		if (allowedExtensions.has(extname(absolutePath))) {
			files.push(absolutePath);
		}
	}

	return files;
}

function addFinding(filePath, lineNumber, rule, excerpt) {
	findings.push({
		filePath,
		lineNumber,
		rule,
		excerpt: excerpt.trim()
	});
}

for (const absolutePath of collectFiles(sourceDir)) {
	const filePath = relative(rootDir, absolutePath).replaceAll('\\', '/');

	if (isAllowlisted(filePath)) {
		continue;
	}

	const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/);

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			return;
		}

		if (!trimmed.includes('theme-color') && /#[0-9a-fA-F]{3,8}\b/.test(trimmed)) {
			addFinding(filePath, lineNumber, 'hard-coded hex color', line);
		}

		if (/\brgba?\(/.test(trimmed)) {
			addFinding(filePath, lineNumber, 'hard-coded rgb color', line);
		}

		for (const match of trimmed.matchAll(/@media\s*\((?:max|min)-width:\s*(\d+)px\)/g)) {
			const breakpoint = match[1];
			if (!allowedBreakpoints.has(breakpoint)) {
				addFinding(filePath, lineNumber, `non-standard breakpoint ${breakpoint}px`, line);
			}
		}
	});
}

if (findings.length > 0) {
	console.error('CWUI style audit failed:\n');
	for (const finding of findings) {
		console.error(
			`- ${finding.filePath}:${finding.lineNumber} ${finding.rule}\n  ${finding.excerpt}`
		);
	}
	process.exit(1);
}

console.log('CWUI style audit passed.');
