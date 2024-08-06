<script lang="ts">
	import { mdiAccount, mdiAccountCircle, mdiCog, mdiExitRun, mdiHelpCircle, mdiMagnify, mdiMoonFirstQuarter, mdiReload, mdiThemeLightDark, mdiWeatherNight } from '@mdi/js';
	import { Avatar, Button, Icon, Menu, MenuItem, TextField, ThemeSwitch, Toggle } from 'svelte-ux';
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button on:click={toggle}>
		
        <div class="flex flex-row gap-4">
            <div>
                <Avatar>
                    <Icon data={mdiAccountCircle} size="lg" />
                </Avatar>
            </div>
            <div class="flex flex-col text-left gap-1">
                <p>Kevin Cantrell</p>
                <hr class="h-px bg-gray-200 w-full">
                <p class="text-xs text-left text-secondary-100">System Admin</p>
            </div>
        </div>

		<Menu {open} on:close={toggleOff} explicitClose let:close>
			<div class="p-2">
				<TextField icon={mdiMagnify} placeholder="Search" class="mb-2" autofocus={{ delay: 50 }} />
				<MenuItem on:click={() => (location.reload())} icon={mdiReload}>Refresh</MenuItem>
				<MenuItem on:click={close} icon={mdiCog}>Settings</MenuItem>
                <MenuItem icon={mdiThemeLightDark}>Dark Mode: <ThemeSwitch /></MenuItem>
				<MenuItem on:click={close} icon={mdiHelpCircle}>Help</MenuItem>
				<MenuItem on:click={close} icon={mdiExitRun}>Sign Out</MenuItem>
			</div>
		</Menu>
	</Button>
</Toggle>
