import { describe, expect, it } from 'vitest';
import type { LocationOwnerDto } from '$lib/api/api.dtos';
import { mapLocationOwnersToPermissionRows } from './location-permission-rows';

describe('mapLocationOwnersToPermissionRows', () => {
	it('maps location owners into editable permission rows', () => {
		const rows = mapLocationOwnersToPermissionRows([
			{
				id: 14,
				user_id: 'user-1',
				location_id: 9,
				owner_id: 3,
				admin_user_id: 'admin-1',
				permission_level: 2,
				profiles: {
					email: 'owner@example.com',
					full_name: 'Owner Name'
				}
			} as unknown as LocationOwnerDto
		]);

		expect(rows).toEqual([
			{
				id: 14,
				email: 'owner@example.com',
				name: 'Owner Name',
				permission_level: '2'
			}
		]);
	});

	it('falls back to nested permission records and missing profile data', () => {
		const rows = mapLocationOwnersToPermissionRows([
			{
				id: 21,
				user_id: 'user-2',
				location_id: 9,
				owner_id: 3,
				admin_user_id: 'admin-1',
				permission_level: {
					value: '3'
				},
				email: 'direct@example.com',
				name: 'Direct Name'
			} as unknown as LocationOwnerDto
		]);

		expect(rows).toEqual([
			{
				id: 21,
				email: 'direct@example.com',
				name: 'Direct Name',
				permission_level: '3'
			}
		]);
	});

	it('reads a level given as text or under level, and defaults to Viewer', () => {
		const levels = mapLocationOwnersToPermissionRows(
			[' 1 ', { level: '2' }, { permission_level: ' ' }, null, Number.NaN].map(
				(permission_level, index) =>
					({
						id: index,
						user_email: 'u@example.com',
						permission_level
					}) as unknown as LocationOwnerDto
			)
		).map((row) => row.permission_level);

		expect(levels).toEqual(['1', '2', '4', '4', '4']);
	});

	it('reads the email and name from their other fields, else leaves them blank', () => {
		const rows = mapLocationOwnersToPermissionRows([
			{
				id: 1,
				user_email: 'user@example.com',
				full_name: 'Full Name',
				permission_level: 3
			} as unknown as LocationOwnerDto,
			{
				id: 2,
				profiles: { display_name: 'Display' },
				permission_level: 3
			} as unknown as LocationOwnerDto,
			{ id: 3, profiles: 'none', permission_level: 3 } as unknown as LocationOwnerDto
		]);

		expect(rows.map(({ email, name }) => ({ email, name }))).toEqual([
			{ email: 'user@example.com', name: 'Full Name' },
			{ email: '', name: 'Display' },
			{ email: '', name: '' }
		]);
	});

	it('returns an empty list when there are no location owners', () => {
		expect(mapLocationOwnersToPermissionRows(undefined)).toEqual([]);
	});
});
