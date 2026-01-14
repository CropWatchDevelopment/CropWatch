<script lang="ts">
	import Avatar from './Avatar.svelte';
	import CWSelect from './CWSelect.svelte';
	import CWButton from './CWButton.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	type PermissionId = 1 | 2 | 3 | 4;

	export interface PermissionOption {
		id: PermissionId;
		name: string;
		description: string;
	}

	export interface LocationPermissionUser {
		id?: string;
		user_id: string;
		full_name: string;
		email: string;
		avatar_url?: string | null;
		permission_level: PermissionId;
	}

	interface Props {
		user: LocationPermissionUser;
		supabase: SupabaseClient;
		currentUserId?: string;
		currentUserPermissionLevel?: PermissionId;
		permissionLevels?: PermissionOption[];
		loading?: boolean;
		onPermissionChange?: (user: LocationPermissionUser, newLevel: PermissionId) => void | Promise<void>;
		onRemove?: (user: LocationPermissionUser) => void | Promise<void>;
	}

	let {
		user,
		supabase,
		currentUserId = '',
		currentUserPermissionLevel = 4,
		permissionLevels = [
			{ id: 1, name: 'Admin', description: 'Full control. Can add/remove devices and manage members.' },
			{ id: 2, name: 'Editor', description: 'Can edit names, create alerts/reports. Cannot move or delete devices.' },
			{ id: 3, name: 'User', description: 'View-only access. No settings.' },
			{ id: 4, name: 'Disabled', description: 'No access to this location.' }
		],
		loading = false,
		onPermissionChange,
		onRemove
	}: Props = $props();

	const isSelf = $derived(user.user_id === currentUserId);
	const viewerLevel = $derived(currentUserPermissionLevel ?? 4);
	const canManage = $derived(viewerLevel <= 2);
	const canChangeThisUser = $derived(canManage && !isSelf);

	const roleColors: Record<PermissionId, string> = {
		1: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/30',
		2: 'bg-sky-500/20 text-sky-200 ring-sky-500/30',
		3: 'bg-slate-500/20 text-slate-200 ring-slate-500/30',
		4: 'bg-rose-500/20 text-rose-200 ring-rose-500/30'
	};

	let isUpdating = $state(false);
	let selectedLevel = $state<PermissionId>(user.permission_level);

	const permissionName = $derived(
		permissionLevels.find((p) => p.id === user.permission_level)?.name ?? 'Unknown'
	);

	const helperText = $derived(
		permissionLevels.find((p) => p.id === selectedLevel)?.description ?? ''
	);

	async function handleChange(level: PermissionId) {
		selectedLevel = level;
		if (!onPermissionChange || level === user.permission_level || isUpdating) return;
		isUpdating = true;
		try {
			await onPermissionChange(user, level);
		} finally {
			isUpdating = false;
		}
	}

	async function handleRemove() {
		if (!onRemove || isSelf || isUpdating) return;
		isUpdating = true;
		try {
			await onRemove(user);
		} finally {
			isUpdating = false;
		}
	}
</script>

<div
	class="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-colors hover:bg-slate-900"
	class:opacity-60={loading || isUpdating}
>
	<div class="flex items-center gap-3 min-w-0">
		<Avatar size="md" avatarUrl={user.avatar_url} initials={user.full_name?.charAt(0) ?? '?'} {supabase} />
		<div class="min-w-0">
			<p class="truncate font-medium text-white">{user.full_name}</p>
			<p class="truncate text-sm text-slate-400">{user.email}</p>
		</div>
	</div>

	<div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3 flex-shrink-0">
		{#if canChangeThisUser}
			<div class="w-56">
				<CWSelect
					options={permissionLevels.map((level) => ({ value: level.id, label: level.name }))}
					bind:value={selectedLevel}
					onchange={(event) =>
						handleChange(Number((event.currentTarget as HTMLSelectElement).value) as PermissionId)}
					loading={isUpdating}
					disabled={loading}
					label="Permission"
					helpText={helperText}
				/>
			</div>
		{:else}
			<span class={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${roleColors[user.permission_level]}`}>
				{permissionName}{isSelf ? ' • You' : ''}
			</span>
			{#if helperText}
				<p class="text-xs text-slate-400 max-w-xs text-right">{helperText}</p>
			{/if}
		{/if}

		{#if canChangeThisUser && onRemove}
			<CWButton
				variant="ghost"
				size="sm"
				class="text-red-400 hover:text-red-300 hover:bg-red-500/10"
				onclick={handleRemove}
				disabled={isUpdating}
			>
				Remove
			</CWButton>
		{/if}
	</div>
</div>
