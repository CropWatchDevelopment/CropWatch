/**
 * CropWatch permission model — mirror of the API's
 * api/src/v1/common/permission-levels.ts. Keep the two files in sync.
 *
 * Owner is implicit (cw_locations.owner_id / cw_devices.user_id) and outranks
 * every level.
 */
export const PermissionLevel = {
	ADMIN: 1,
	MANAGER: 2,
	USER: 3,
	VIEWER: 4,
	DISABLED: 5
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export const MIN_PERMISSION_LEVEL: PermissionLevel = PermissionLevel.ADMIN;
export const MAX_PERMISSION_LEVEL: PermissionLevel = PermissionLevel.DISABLED;

export function canRead(level: number | null | undefined): boolean {
	return level != null && level < PermissionLevel.DISABLED;
}

export function canManage(level: number | null | undefined): boolean {
	return level != null && level <= PermissionLevel.MANAGER;
}

export function isAdmin(level: number | null | undefined): boolean {
	return level === PermissionLevel.ADMIN;
}

export function isValidPermissionLevel(level: number): boolean {
	return (
		Number.isInteger(level) && level >= MIN_PERMISSION_LEVEL && level <= MAX_PERMISSION_LEVEL
	);
}
