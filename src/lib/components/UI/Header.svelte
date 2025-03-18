<script lang="ts">
	import { AppBar, ThemeSelect } from 'svelte-ux';
	import AvatarCard from './AvatarCard.svelte';
</script>

<AppBar class="text-primary-content" title="CropWatch">
	<div slot="actions" class="flex flex-row">
		<span class="hidden sm:flex">
			<ThemeSelect lightThemes={['light']} darkThemes={['dark']} />
		</span>
		<AvatarCard />
	</div>
</AppBar>
