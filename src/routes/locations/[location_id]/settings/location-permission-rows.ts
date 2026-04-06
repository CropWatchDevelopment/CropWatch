import type { LocationOwnerDto } from '$lib/api/api.dtos';

export interface PermissionRow {
	id: number;
	email: string;
	name: string;
	permission_level: string;
}

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readPermissionLevel(value: unknown): string {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}

	const direct = readString(value);
	if (direct) {
		return direct;
	}

	if (!value || typeof value !== 'object') {
		return '4';
	}

	const record = value as Record<string, unknown>;
	return (
		readString(record.permission_level) ||
		readString(record.value) ||
		readString(record.level) ||
		'4'
	);
}

export function mapLocationOwnersToPermissionRows(
	locationOwners: LocationOwnerDto[] | undefined
): PermissionRow[] {
	return (locationOwners ?? []).map((owner) => {
		const record = owner as Record<string, unknown>;
		const profiles =
			record.profiles && typeof record.profiles === 'object'
				? (record.profiles as Record<string, unknown>)
				: undefined;

		return {
			id: owner.id,
			email: readString(record.email) || readString(record.user_email) || readString(profiles?.email),
			name:
				readString(record.name) ||
				readString(record.full_name) ||
				readString(profiles?.full_name) ||
				readString(profiles?.display_name),
			permission_level: readPermissionLevel(record.permission_level)
		};
	});
}
