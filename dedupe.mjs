import fs from 'fs';

function deduplicateJSObjectFile(filePath) {
    console.log(`Processing ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const seen = new Set();
    const outputLines = [];
    let inObject = false;
    let bracketCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if we're entering the object
        if (trimmed.includes('export const strings = {')) {
            inObject = true;
            outputLines.push(line);
            continue;
        }
        
        // If we haven't reached the object yet, keep the line
        if (!inObject) {
            outputLines.push(line);
            continue;
        }
        
        // Track bracket depth
        for (const char of line) {
            if (char === '{') bracketCount++;
            if (char === '}') bracketCount--;
        }
        
        // If we've closed the main object, add the rest and exit
        if (bracketCount <= 0 && trimmed === '};') {
            outputLines.push(line);
            // Add any remaining lines after the object
            for (let j = i + 1; j < lines.length; j++) {
                outputLines.push(lines[j]);
            }
            break;
        }
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//')) {
            outputLines.push(line);
            continue;
        }
        
        // Extract key from property lines
        const keyMatch = trimmed.match(/^(['"`]?)([^'"`:\s,]+)\1\s*:/);
        if (keyMatch) {
            const key = keyMatch[2];
            if (seen.has(key)) {
                console.log(`  Removing duplicate: ${key}`);
                continue; // Skip this duplicate line
            }
            seen.add(key);
        }
        
        outputLines.push(line);
    }
    
    const newContent = outputLines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`  Deduplicated ${filePath}`);
}

// Process both files
deduplicateJSObjectFile('./src/lib/i18n/locales/en.ts');
deduplicateJSObjectFile('./src/lib/i18n/locales/ja.ts');
