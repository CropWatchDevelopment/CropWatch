<script lang="ts">
	import { AppBar, ThemeSelect } from 'svelte-ux';
	import AvatarCard from './AvatarCard.svelte';
</script>

<AppBar class="bg-primary text-primary-content shadow-md [text-shadow:1px_1px_2px_var(--color-primary-700)]">
	<div slot="title" class="flex flex-row items-center">
		<img src="/icons/favicon.png" alt="CropWatch Logo" class="h-8 w-8 mr-2" />
		<h1 class="text-lg font-bold">CropWatch</h1>
	</div>
	<div slot="actions" class="flex flex-row">
		<span class="hidden sm:flex">
			<ThemeSelect lightThemes={['light']} darkThemes={['dark']} />
		</span>
		<AvatarCard />
	</div>
</AppBar>
