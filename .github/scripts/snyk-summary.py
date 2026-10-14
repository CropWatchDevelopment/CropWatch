"""Summarise Snyk results for the Security workflow.

Reads the dependency scan (`snyk test --json-file-output`) and the code scan
(`snyk code test --sarif-file-output`), writes a shields.io endpoint badge and
a job summary, and exits non-zero when the repo is not clean.

Counted as vulnerabilities: every open dependency issue, plus Snyk Code
findings at high or medium. Low code findings are listed in the summary but
don't fail the job. Test code (the e2e harness, e2e/ and *.spec.ts) is
excluded from Snyk Code in .snyk.

Usage: snyk-summary.py DEPS_JSON CODE_SARIF DEPS_EXIT CODE_EXIT BADGE_OUT
"""
import json
import os
import sys

deps_path, code_path, deps_exit, code_exit, badge_out = sys.argv[1:6]
deps_exit, code_exit = int(deps_exit), int(code_exit)

# Snyk exit codes: 0 clean, 1 issues found, 2 error, 3 nothing to test.
scan_error = deps_exit not in (0, 1) or code_exit not in (0, 1)

dependency_issues = set()
if os.path.exists(deps_path):
    with open(deps_path) as fh:
        projects = json.load(fh)
    for project in projects if isinstance(projects, list) else [projects]:
        for vuln in project.get('vulnerabilities', []):
            dependency_issues.add((project.get('displayTargetFile'), vuln['id'], vuln['severity']))

code_levels = {'error': 0, 'warning': 0, 'note': 0}
if os.path.exists(code_path):
    with open(code_path) as fh:
        sarif = json.load(fh)
    for run in sarif.get('runs', []):
        for result in run.get('results', []):
            if not result.get('suppressions'):
                code_levels[result.get('level', 'note')] = code_levels.get(result.get('level', 'note'), 0) + 1

by_severity = {}
for _, _, severity in dependency_issues:
    by_severity[severity] = by_severity.get(severity, 0) + 1
code_high, code_medium, code_low = code_levels['error'], code_levels['warning'], code_levels['note']
total = len(dependency_issues) + code_high + code_medium

if scan_error:
    badge = {'message': 'scan error', 'color': 'lightgrey'}
elif total == 0:
    badge = {'message': '0', 'color': 'brightgreen'}
else:
    worst_high = by_severity.get('critical', 0) + by_severity.get('high', 0) + code_high
    badge = {'message': str(total), 'color': 'red' if worst_high else 'orange'}

with open(badge_out, 'w') as fh:
    json.dump({'schemaVersion': 1, 'label': 'vulnerabilities', **badge}, fh)

summary = [
    '## Snyk',
    '',
    '| Scan | Result |',
    '| --- | --- |',
    f"| Dependencies | {len(dependency_issues)} open"
    + (f" ({', '.join(f'{n} {s}' for s, n in sorted(by_severity.items()))})" if by_severity else '')
    + f' (snyk test exit {deps_exit}) |',
    f'| Code | {code_high} high, {code_medium} medium, {code_low} low (snyk code exit {code_exit}) |',
    '',
    f"Badge: **vulnerabilities: {badge['message']}**",
]
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as fh:
        fh.write('\n'.join(summary) + '\n')
print('\n'.join(summary))

sys.exit(1 if scan_error or total else 0)
