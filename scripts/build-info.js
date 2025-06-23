#!/usr/bin/env node
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

// helper to run shell commands
function run(cmd) {
	return execSync(cmd, { encoding: 'utf8' }).trim();
}

// 1. Git info
const commitHash = run('git rev-parse --short HEAD');
const branch = run('git rev-parse --abbrev-ref HEAD');
const commitUser = run("git log -1 --pretty=format:'%an'");

// 2. Timestamp
const buildDate = new Date().toISOString();

// 3. Host info
const host = os.hostname();
const user = os.userInfo().username;

// 4. Local IP (first non-internal IPv4)
function getLocalIP() {
	const nets = os.networkInterfaces();
	for (const name of Object.keys(nets)) {
		for (const net of nets[name]) {
			if (net.family === 'IPv4' && !net.internal) {
				return net.address;
			}
		}
	}
	return '127.0.0.1';
}
const ipAddress = getLocalIP();

// format output
const lines = [
	'=== Build Info ===',
	`Commit      : ${commitHash}`,
	`Branch      : ${branch}`,
	`Author      : ${commitUser}`,
	`Date        : ${buildDate}`,
	`Builder     : ${user}@${host}`,
	`IP Address  : ${ipAddress}`,
	'=================='
];
const output = lines.join('\n');

// print to console
console.log('\n\x1b[33m' + lines[0] + '\x1b[0m');
lines
	.slice(1, -1)
	.forEach((line) => console.log(`  • ${line.split(': ')[0].padEnd(12)} ${line.split(': ')[1]}`));
console.log('\x1b[33m' + lines[lines.length - 1] + '\x1b[0m\n');

// write to file at project root
const filePath = path.join(process.cwd(), 'build-info.txt');
fs.writeFileSync(filePath, output + '\n', { encoding: 'utf8' });
console.log(`Build info written to ${filePath}\n`);
