<script lang="ts">
	import GeneralAppSettings from '$lib/components/UI/GeneralAppSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiCog } from '@mdi/js';
	import { Icon, Tabs } from 'svelte-ux';
	import type { SupabaseClient } from '@supabase/supabase-js'
	import { createEventDispatcher } from 'svelte'

	let { data } = $props();
	const supabase = $derived(data.supabase);

	let size = $state(10);
	let url: string = $state('')
	let avatarUrl: string | null = $state(null)
	let uploading = $state(false)
	let files: FileList = $state();
	const downloadImage = async (path: string) => {
		try {
			const { data, error } = await supabase.storage.from('avatars').download(path)
			if (error) {
				throw error
			}
			const url = URL.createObjectURL(data)
			avatarUrl = url
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error downloading image: ', error.message)
			}
		}
	}
	const uploadAvatar = async () => {
		try {
			uploading = true
			if (!files || files.length === 0) {
				throw new Error('You must select an image to upload.')
			}
			const file = files[0]
			const fileExt = file.name.split('.').pop()
			const filePath = `${Math.random()}.${fileExt}`
			const { error } = await supabase.storage.from('avatars').upload(filePath, file)
			if (error) {
				throw error
			}
			url = filePath
			// setTimeout(() => {
			// 	dispatch('upload')
			// }, 100)
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message)
			}
		} finally {
			uploading = false
		}
	}

	$effect(() => {
		if (url) downloadImage(url)
	})

	let userContext = getUserState();
	userContext.fetchLocations();

	let options = [
		{ label: 'General', value: 1 },
        { label: 'Notation Settings', value: 2 },
	];

	let value: number = $state(1);
</script>

<h1 class="mb-1 flex w-full flex-row">
	<Icon data={mdiCog} class="mr-2 items-center" />
	App wide Settings
</h1>

<Tabs {options} bind:value>
	<svelte:fragment slot="content" let:value>
		{#if value === 1}
			<GeneralAppSettings />
		{:else if value === 2}
			settings 2
		{/if}
	</svelte:fragment>
</Tabs>

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
	<div style="width: {size}em;">
		<label class="button primary block" for="single">
			{uploading ? 'Uploading ...' : 'Upload'}
		</label>
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