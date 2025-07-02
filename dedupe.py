#!/usr/bin/env python3

import re

def deduplicate_locale_file(file_path):
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split content by lines
    lines = content.split('\n')
    
    # Find the object start and end
    obj_start = -1
    obj_end = -1
    
    for i, line in enumerate(lines):
        if 'export const strings = {' in line:
            obj_start = i
        elif obj_start != -1 and line.strip() == '};':
            obj_end = i
            break
    
    if obj_start == -1 or obj_end == -1:
        print(f"Could not find object boundaries in {file_path}")
        return
    
    # Extract prefix, object content, and suffix
    prefix = lines[:obj_start+1]
    obj_lines = lines[obj_start+1:obj_end]
    suffix = lines[obj_end:]
    
    # Deduplicate object content
    seen_keys = set()
    dedupe_lines = []
    
    for line in obj_lines:
        stripped = line.strip()
        
        # Skip empty lines and comments
        if not stripped or stripped.startswith('//'):
            dedupe_lines.append(line)
            continue
        
        # Extract key from property definition
        key_match = re.match(r"^\s*(['\"`]?)([^'\"`:\s,]+)\1\s*:", line)
        if key_match:
            key = key_match.group(2)
            if key in seen_keys:
                print(f"  Removing duplicate key: {key}")
                continue
            seen_keys.add(key)
        
        dedupe_lines.append(line)
    
    # Reconstruct the file
    new_content = '\n'.join(prefix + dedupe_lines + suffix)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"  Deduplicated {file_path} - removed {len(obj_lines) - len(dedupe_lines)} duplicates")

# Process both files
deduplicate_locale_file('src/lib/i18n/locales/en.ts')
deduplicate_locale_file('src/lib/i18n/locales/ja.ts')
