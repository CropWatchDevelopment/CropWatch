<script>
	import '../app.css';
	import { AppBar, AppLayout, Button, ThemeSwitch } from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';

</script>

<AppLayout areas="'header header' 'aside main'">
	<svelte:fragment slot="nav">
		<!-- Nav menu -->
		<nav class="nav bg-secondary">
			<ul>
				<li>
					<a href="/">Home</a>
				</li>
				<li>
					<a href="/about">About</a>
				</li>
			</ul>
		</nav>
	</svelte:fragment>

	<AppBar title="CropWatch" class="bg-primary text-primary-content">
		<svelte:fragment slot="menuIcon" let:toggleMenu let:isMenuOpen>
			<Button on:click={toggleMenu} variant="none">
				<img src={CROPWATCH_LOGO} alt="CropWatch" class="h-8" />
			</Button>
		</svelte:fragment>
		<div slot="actions">
			<UserHeaderWidget />
		</div>
	</AppBar>

	<main>
		<slot />
	</main>
</AppLayout>
