<script lang="ts">
	import { AppBar, NavItem, Tooltip } from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import { page } from '$app/stores';
	import { mdiExitToApp, mdiWeb } from '@mdi/js';
</script>

<AppBar title="CropWatch Legal" class="bg-primary text-primary-content">
	<img src={CROPWATCH_LOGO} alt="CropWatch Logo" class="my-2 h-8 w-8" slot="menuIcon" />
	<div slot="actions" class="flex gap-5">
        <Tooltip title="Return to Website" placement="left">
			<NavItem icon={mdiWeb} currentUrl={$page.url} path="/" />
		</Tooltip>
		<Tooltip title="Return to APP" placement="left">
			<NavItem icon={mdiExitToApp} currentUrl={$page.url} path="/" />
		</Tooltip>
	</div>
</AppBar>
<div class="pt-2 px-10">
	<slot />
</div>
