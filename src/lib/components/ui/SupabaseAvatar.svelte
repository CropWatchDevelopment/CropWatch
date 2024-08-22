<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createEventDispatcher } from 'svelte';

	export let size = 10;
	export let url: string;
	export let supabase: SupabaseClient;

	let avatarUrl: string | null = null;
	let uploading = false;
	let files: FileList;

	const dispatch = createEventDispatcher();

	const downloadImage = async (path: string) => {
		try {
			const { data, error } = await supabase.storage.from('avatars').download(path);

			if (error) {
				throw error;
			}

			const url = URL.createObjectURL(data);
			avatarUrl = url;
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error downloading image: ', error.message);
			}
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
			setTimeout(() => {
				dispatch('upload');
			}, 100);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			}
		} finally {
			uploading = false;
		}
	};

	$: if (url) downloadImage(url);
</script>

<div class="grid grid-flow-col gap-10">
	<div>
		{#if avatarUrl}
			<img
				src={avatarUrl}
				alt={avatarUrl ? 'Avatar' : 'No image'}
				class="avatar image"
				style="height: {size}em; width: {size}em;"
			/>
		{:else}
			<div class="avatar no-image" style="height: {size}em; width: {size}em;" />
		{/if}
		<input type="hidden" name="avatarUrl" value={url} />
	</div>

	<!-- Centering the button and text inside the container -->
	<div class="flex flex-col justify-center items-center" style="width: {size}em;">
		<label
			class="align-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
			for="single"
		>
			{uploading ? 'Uploading ...' : 'Change avatar'}
		</label>
        <p class="mt-2 text-xs leading-5 text-gray-400">JPG, GIF or PNG. 1MB max.</p>
		<input
			style="visibility: hidden; position:absolute;"
			type="file"
			id="single"
			accept="image/*"
			bind:files
			on:change={uploadAvatar}
			disabled={uploading}
		/>
	</div>
</div>