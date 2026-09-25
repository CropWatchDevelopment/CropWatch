import { describe, expect, it } from 'vitest';
import { assignableRoles, canRemove, canSuspend, inviteableRoles } from './org-member-policy';

describe('inviteableRoles', () => {
	it('lets the owner invite every role including guests', () => {
		expect(inviteableRoles('owner')).toEqual(['manager', 'member', 'guest']);
	});

	it('limits managers to managers and members', () => {
		expect(inviteableRoles('manager')).toEqual(['manager', 'member']);
	});

	it('gives members, guests and unknown roles nothing', () => {
		expect(inviteableRoles('member')).toEqual([]);
		expect(inviteableRoles('guest')).toEqual([]);
		expect(inviteableRoles(null)).toEqual([]);
		expect(inviteableRoles(undefined)).toEqual([]);
	});
});

describe('assignableRoles', () => {
	it('lets the owner swap manager and member', () => {
		expect(assignableRoles('owner', 'member')).toEqual(['manager']);
		expect(assignableRoles('owner', 'manager')).toEqual(['member']);
	});

	it('never offers changes for owners or guests', () => {
		expect(assignableRoles('owner', 'owner')).toEqual([]);
		expect(assignableRoles('owner', 'guest')).toEqual([]);
	});

	it('gives managers no role changes (they cannot promote)', () => {
		expect(assignableRoles('manager', 'member')).toEqual([]);
		expect(assignableRoles('manager', 'manager')).toEqual([]);
	});
});

describe('canSuspend', () => {
	it('never allows self-suspension or suspending the owner', () => {
		expect(canSuspend('owner', 'manager', true)).toBe(false);
		expect(canSuspend('owner', 'owner', false)).toBe(false);
	});

	it('lets the owner suspend anyone else', () => {
		expect(canSuspend('owner', 'manager', false)).toBe(true);
		expect(canSuspend('owner', 'member', false)).toBe(true);
		expect(canSuspend('owner', 'guest', false)).toBe(true);
	});

	it('limits managers to members', () => {
		expect(canSuspend('manager', 'member', false)).toBe(true);
		expect(canSuspend('manager', 'manager', false)).toBe(false);
		expect(canSuspend('manager', 'guest', false)).toBe(false);
	});
});

describe('canRemove', () => {
	it('never removes the owner, even by themselves', () => {
		expect(canRemove('owner', 'owner', true)).toBe(false);
	});

	it('lets anyone except the owner leave', () => {
		expect(canRemove('member', 'member', true)).toBe(true);
		expect(canRemove('manager', 'manager', true)).toBe(true);
	});

	it('lets the owner remove anyone and managers remove members only', () => {
		expect(canRemove('owner', 'manager', false)).toBe(true);
		expect(canRemove('owner', 'guest', false)).toBe(true);
		expect(canRemove('manager', 'member', false)).toBe(true);
		expect(canRemove('manager', 'manager', false)).toBe(false);
		expect(canRemove('member', 'member', false)).toBe(false);
	});
});
