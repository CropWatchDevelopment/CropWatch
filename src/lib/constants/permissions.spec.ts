import { describe, expect, it } from 'vitest';
import {
	MAX_PERMISSION_LEVEL,
	MIN_PERMISSION_LEVEL,
	PermissionLevel,
	canManage,
	canRead,
	isAdmin,
	isValidPermissionLevel
} from './permissions';

describe('PermissionLevel', () => {
	it("mirrors the API's numeric levels, most privileged first", () => {
		expect(PermissionLevel).toEqual({ ADMIN: 1, MANAGER: 2, USER: 3, VIEWER: 4, DISABLED: 5 });
		expect(MIN_PERMISSION_LEVEL).toBe(PermissionLevel.ADMIN);
		expect(MAX_PERMISSION_LEVEL).toBe(PermissionLevel.DISABLED);
	});
});

describe('canRead', () => {
	it('lets every enabled level read', () => {
		for (const level of [
			PermissionLevel.ADMIN,
			PermissionLevel.MANAGER,
			PermissionLevel.USER,
			PermissionLevel.VIEWER
		]) {
			expect(canRead(level)).toBe(true);
		}
	});

	it('denies a disabled member and a missing level', () => {
		expect(canRead(PermissionLevel.DISABLED)).toBe(false);
		expect(canRead(null)).toBe(false);
		expect(canRead(undefined)).toBe(false);
	});

	it('denies values that are not permission levels', () => {
		for (const level of [0, -1, 2.5, 6, Number.NaN, Number.NEGATIVE_INFINITY]) {
			expect(canRead(level), String(level)).toBe(false);
		}
	});
});

describe('canManage', () => {
	it('lets admins and managers manage', () => {
		expect(canManage(PermissionLevel.ADMIN)).toBe(true);
		expect(canManage(PermissionLevel.MANAGER)).toBe(true);
	});

	it('denies users, viewers, disabled members and a missing level', () => {
		expect(canManage(PermissionLevel.USER)).toBe(false);
		expect(canManage(PermissionLevel.VIEWER)).toBe(false);
		expect(canManage(PermissionLevel.DISABLED)).toBe(false);
		expect(canManage(null)).toBe(false);
		expect(canManage(undefined)).toBe(false);
	});

	it('denies values that are not permission levels', () => {
		for (const level of [0, -1, 1.5, Number.NaN, Number.NEGATIVE_INFINITY]) {
			expect(canManage(level), String(level)).toBe(false);
		}
	});
});

describe('isAdmin', () => {
	it('is true for the admin level only', () => {
		expect(isAdmin(PermissionLevel.ADMIN)).toBe(true);
		expect(isAdmin(PermissionLevel.MANAGER)).toBe(false);
		expect(isAdmin(PermissionLevel.DISABLED)).toBe(false);
		expect(isAdmin(null)).toBe(false);
		expect(isAdmin(undefined)).toBe(false);
	});
});

describe('isValidPermissionLevel', () => {
	it('accepts the whole levels from admin to disabled', () => {
		for (const level of [1, 2, 3, 4, 5]) {
			expect(isValidPermissionLevel(level)).toBe(true);
		}
	});

	it('rejects levels outside the range and fractional levels', () => {
		expect(isValidPermissionLevel(0)).toBe(false);
		expect(isValidPermissionLevel(6)).toBe(false);
		expect(isValidPermissionLevel(-1)).toBe(false);
		expect(isValidPermissionLevel(2.5)).toBe(false);
		expect(isValidPermissionLevel(Number.NaN)).toBe(false);
	});
});
