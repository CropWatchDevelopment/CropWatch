<script lang="ts">
	import CWButton from './CWButton.svelte';
	import Avatar from './Avatar.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { page } from '$app/state';
	/**
	 * Permission level configuration matching cw_permission_level_types table
	 */
	export interface PermissionLevel {
		id: number;
		name: string;
	}

	/**
	 * User with permission data
	 */
	export interface PermissionUser {
		id: string;
		user_id: string;
		full_name: string;
		email: string;
		avatar_url?: string | null;
		permission_level: number;
		permission_name?: string;
		is_active?: boolean;
	}

	interface Props {
		/** The user with permission data */
		user: PermissionUser;
		/** Supabase client for avatar storage access */
		supabase: SupabaseClient;
		/** Available permission levels */
		permissionLevels?: PermissionLevel[];
		/** Whether this user is the owner (cannot be edited/removed) */
		isOwner?: boolean;
		/** Whether the current viewer can edit this user's permissions */
		canEdit?: boolean;
		/** Whether the current viewer can remove this user */
		canRemove?: boolean;
		/** Whether the row is in a loading state */
		loading?: boolean;
		/** Show the edit dropdown inline instead of actions menu */
		inlineEdit?: boolean;
		/** Callback when permission level is changed */
		onPermissionChange?: (user: PermissionUser, newLevel: number) => void | Promise<void>;
		/** Callback when edit button is clicked */
		onEdit?: (user: PermissionUser) => void;
		/** Callback when remove button is clicked */
		onRemove?: (user: PermissionUser) => void;
	}

	let {
		user,
		supabase,
		permissionLevels = [
			{ id: 1, name: 'Admin' },
			{ id: 2, name: 'Editor' },
			{ id: 3, name: 'Viewer' },
			{ id: 4, name: 'Disabled' }
		],
		isOwner = false,
		canEdit = true,
		canRemove = true,
		loading = false,
		inlineEdit = false,
		onPermissionChange,
		onEdit,
		onRemove
	}: Props = $props();

	let isUpdating = $state(false);

	/** Get permission name from level */
	const permissionName = $derived(
		user.permission_name ??
			permissionLevels.find((p) => p.id === user.permission_level)?.name ??
			'Unknown'
	);

	/** Generate initials for avatar fallback */
	const avatarInitials = $derived.by(() => {
		if (!user.full_name) return '?';
		const parts = user.full_name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
		return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
	});

	/** Role color classes based on permission level */
	const roleColors: Record<number, string> = {
		1: 'bg-slate-500/20 text-slate-300 ring-slate-500/30', // Viewer
		2: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30', // Operator
		3: 'bg-sky-500/20 text-sky-300 ring-sky-500/30', // Manager
		4: 'bg-purple-500/20 text-purple-300 ring-purple-500/30' // Admin
	};

	const ownerColors = 'bg-amber-500/20 text-amber-300 ring-amber-500/30';

	const badgeClass = $derived(
		isOwner ? ownerColors : (roleColors[user.permission_level] ?? roleColors[1])
	);

	async function handlePermissionChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newLevel = parseInt(target.value, 10);

		if (newLevel === user.permission_level || !onPermissionChange) return;

		isUpdating = true;
		try {
			await onPermissionChange(user, newLevel);
		} finally {
			isUpdating = false;
		}
	}

	function handleEdit() {
		onEdit?.(user);
	}

	async function handleRemove() {
		let removedUser = await fetch('/api/private/location/delete-location-user', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				user_id: user.user_id,
				location_id: page.params.location_id
			})
		}).then((res) => res.json());
	}
</script>

<div
	class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:bg-slate-900/60"
	class:opacity-50={loading || isUpdating}
>
	<!-- User Info -->
	<div class="flex items-center gap-3 min-w-0">
		<!-- Avatar -->
		<div class="flex-shrink-0">
			<Avatar size="md" avatarUrl={user.avatar_url} initials={avatarInitials} {supabase} />
		</div>

		<!-- Name & Email -->
		<div class="min-w-0 flex-1">
			<p class="truncate font-medium text-white">{user.full_name}</p>
			<p class="truncate text-sm text-slate-400">{user.email}</p>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex items-center gap-3 flex-shrink-0 ml-4">
		<!-- Permission Badge / Selector -->
		{#if isOwner}
			<span class="rounded-full px-3 py-1 text-xs font-medium ring-1 {badgeClass}"> Owner </span>
		{:else if inlineEdit && canEdit && !loading}
			<select
				value={user.permission_level}
				onchange={handlePermissionChange}
				disabled={isUpdating}
				class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
			>
				{#each permissionLevels as level (level.id)}
					<option value={level.id}>{level.name}</option>
				{/each}
			</select>
		{:else}
			<span class="rounded-full px-3 py-1 text-xs font-medium ring-1 {badgeClass}">
				{permissionName}
			</span>
		{/if}

		<!-- Action Buttons -->
		{#if !isOwner && !loading}
			{#if canEdit && !inlineEdit && onEdit}
				<CWButton variant="ghost" size="sm" onclick={handleEdit}>Edit</CWButton>
			{/if}

			{#if canRemove && onRemove}
				<CWButton
					variant="ghost"
					size="sm"
					onclick={() => handleRemove()}
					class="text-red-400 hover:text-red-300 hover:bg-red-500/10"
				>
					Remove
				</CWButton>
			{/if}
		{/if}

		<!-- Loading spinner -->
		{#if isUpdating}
			<svg
				class="h-4 w-4 animate-spin text-sky-400"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
	</div>
</div>
