<script>
	import '../../app.css';
	import { AppBar, AppLayout, Button, NavItem, ThemeSwitch } from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
</script>

<AppLayout areas="'header header' 'aside main'" class="h-full">
	<svelte:fragment slot="nav">
		<!-- Nav menu -->
		<nav class="nav mr-1 h-full bg-secondary">
			<ul>
				<li>
					<NavItem
						text="Dashboard"
						currentUrl={$page.url}
						path="/app/dashboard"
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
				<li>
					<NavItem
						text="All Locations"
						currentUrl={$page.url}
						path="/app/locations"
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
				<li>
					<NavItem
						text="App Settings"
						currentUrl={$page.url}
						path="/app/settings"
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
			</ul>
		</nav>
	</svelte:fragment>

	<AppBar title="CropWatch" class="bg-primary text-primary-content" head={true}>
		<svelte:fragment slot="menuIcon" let:toggleMenu let:isMenuOpen>
			<Button on:click={toggleMenu} variant="none">
				<img src={CROPWATCH_LOGO} alt="CropWatch" class="h-8" />
			</Button>
		</svelte:fragment>
		<div slot="actions">
			<UserHeaderWidget />
		</div>
	</AppBar>

	<main class="h-full">
		<Back>Back</Back>
		<slot />
	</main>
</AppLayout>
