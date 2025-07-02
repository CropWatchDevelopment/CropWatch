import fs from 'fs';
import path from 'path';

function deduplicateLocaleFile(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');

	// Extract the content between the braces
	const match = content.match(/export const strings = \{([\s\S]*)\};/);
	if (!match) {
		console.log(`Could not parse ${filePath}`);
		return;
	}

	const objContent = match[1];
	const lines = objContent.split('\n');

	const seen = new Set();
	const uniqueLines = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('//')) {
			uniqueLines.push(line);
			continue;
		}

		// Extract the key from lines like "key: 'value'," or 'key': 'value',
		const keyMatch = trimmed.match(/^['"]?([^'":\s]+)['"]?\s*:/);
		if (keyMatch) {
			const key = keyMatch[1];
			if (seen.has(key)) {
				console.log(`Removing duplicate key: ${key}`);
				continue;
			}
			seen.add(key);
		}

		uniqueLines.push(line);
	}

	const newContent = `export const strings = {${uniqueLines.join('\n')}};
`;

	fs.writeFileSync(filePath, newContent);
	console.log(
		`Deduplicated ${filePath} - removed ${lines.length - uniqueLines.length} duplicate entries`
	);
}

// Process both locale files
deduplicateLocaleFile('./src/lib/i18n/locales/en.ts');
deduplicateLocaleFile('./src/lib/i18n/locales/ja.ts');
