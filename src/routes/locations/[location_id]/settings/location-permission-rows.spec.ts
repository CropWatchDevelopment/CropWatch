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

	it('returns an empty list when there are no location owners', () => {
		expect(mapLocationOwnersToPermissionRows(undefined)).toEqual([]);
	});
});
