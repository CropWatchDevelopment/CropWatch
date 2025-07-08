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

// format output as JSON
const buildInfo = {
	commit: commitHash,
	branch: branch,
	author: commitUser,
	date: buildDate,
	builder: `${user}@${host}`,
	ipAddress: ipAddress,
	timestamp: Date.now()
};

const jsonOutput = JSON.stringify(buildInfo, null, 2);

// print to console
console.log('\n\x1b[33m=== Build Info ===\x1b[0m');
console.log(`  • Commit      : ${buildInfo.commit}`);
console.log(`  • Branch      : ${buildInfo.branch}`);
console.log(`  • Author      : ${buildInfo.author}`);
console.log(`  • Date        : ${buildInfo.date}`);
console.log(`  • Builder     : ${buildInfo.builder}`);
console.log(`  • IP Address  : ${buildInfo.ipAddress}`);
console.log('\x1b[33m==================\x1b[0m\n');

// write to JSON file in static directory
const staticDir = path.join(process.cwd(), 'static');
if (!fs.existsSync(staticDir)) {
	fs.mkdirSync(staticDir, { recursive: true });
}

const filePath = path.join(staticDir, 'build-info.json');
fs.writeFileSync(filePath, jsonOutput + '\n', { encoding: 'utf8' });
console.log(`Build info written to ${filePath}\n`);
