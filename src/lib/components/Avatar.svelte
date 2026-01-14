<script lang="ts">
	import type { SupabaseClient } from "@supabase/supabase-js";

	// Size can be a number (pixels) or a string size name
	type SizeValue = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

	interface Props {
		size?: SizeValue;
		url?: string | null;
		avatarUrl?: string | null; // Alias for url - accepts either prop name
		initials?: string | null;
		onupload?: () => void;
		supabase: SupabaseClient;
		showUpload?: boolean;
	}
	
	let { 
		size = 'md', 
		url = $bindable(null), 
		avatarUrl: avatarUrlProp = null,
		initials = null,
		onupload, 
		supabase,
		showUpload = false
	}: Props = $props();
	
	// Use avatarUrl prop as alias for url if url is not provided
	const sourceUrl = $derived(url ?? avatarUrlProp);
	
	// Check if the URL is already a full HTTP URL (public URL) or a storage path
	const isFullUrl = $derived(sourceUrl?.startsWith('http://') || sourceUrl?.startsWith('https://'));
	
	// Convert size to pixels
	const sizeMap: Record<string, number> = {
		'xs': 32,
		'sm': 40,
		'md': 48,
		'lg': 64,
		'xl': 96,
		'2xl': 128
	};
	
	const sizeInPx = $derived(typeof size === 'number' ? size : (sizeMap[size] ?? 48));
	
	let blobUrl = $state<string | null>(null);
	let uploading = $state(false);
	let files = $state<FileList>();
	let downloadError = $state(false);
	
	// The final image URL to display - either the direct URL or the downloaded blob
	const displayUrl = $derived(isFullUrl ? sourceUrl : blobUrl);
	
	const downloadImage = async (path: string) => {
		try {
			downloadError = false;
			const { data, error } = await supabase.storage.from('avatars').download(path);
			if (error) {
				console.log('Error downloading image: ', error.message);
				downloadError = true;
				throw error;
			}
			// Revoke previous blob URL to prevent memory leaks
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
			blobUrl = URL.createObjectURL(data);
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error downloading image: ', error.message);
			}
			downloadError = true;
		}
	};
	
	const uploadAvatar = async () => {
		try {
			uploading = true;
			if (!files || files.length === 0) {
				throw new Error('You must select an image to upload.');
			}
			const file = files[0];
			const fileExt = file.name.split('.').pop();
			const filePath = `${Math.random()}.${fileExt}`;
			const { error } = await supabase.storage.from('avatars').upload(filePath, file);
			if (error) {
				throw error;
			}
			url = filePath;
			onupload?.();
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			}
		} finally {
			uploading = false;
		}
	};
	
	$effect(() => {
		// Only download if it's a storage path, not a full URL
		if (sourceUrl && !isFullUrl) {
			downloadImage(sourceUrl);
		} else {
			// Clean up blob URL when switching to a full URL or null
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
				blobUrl = null;
			}
		}
	});
</script>

<div style="width: {sizeInPx}px; height: {sizeInPx}px;" aria-live="polite" class="relative">
	{#if displayUrl}
		<img
			src={displayUrl}
			alt="Avatar"
			class="h-full w-full rounded-full object-cover"
		/>
	{:else if initials}
		<div 
			class="flex h-full w-full items-center justify-center rounded-full bg-slate-600 text-slate-200 font-medium"
			style="font-size: {sizeInPx * 0.4}px;"
		>
			{initials}
		</div>
	{:else}
		<div class="flex h-full w-full items-center justify-center rounded-full bg-slate-600">
			<svg 
				class="text-slate-400" 
				style="width: {sizeInPx * 0.5}px; height: {sizeInPx * 0.5}px;" 
				fill="currentColor" 
				viewBox="0 0 24 24"
			>
				<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
			</svg>
		</div>
	{/if}
	
	{#if showUpload}
		<div class="mt-2" style="width: {sizeInPx}px;">
			<label class="button primary block cursor-pointer text-center rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700" for="avatar-upload">
				{uploading ? 'Uploading ...' : 'Upload avatar'}
			</label>
			<input
				type="file"
				id="avatar-upload"
				accept="image/*"
				bind:files
				onchange={uploadAvatar}
				disabled={uploading}
				class="hidden"
			/>
		</div>
	{/if}
</div>
