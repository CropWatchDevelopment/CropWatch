<script>
	import {
		AppLayout,
		Breadcrumb,
		Button,
		Dialog,
		ListItem,
		NavItem,
		ProgressCircle,
		TextField
	} from 'svelte-ux';
	import Header from '$lib/components/core/header/Header.svelte';
	import {
		mdiCog,
		mdiDevices,
		mdiFunction,
		mdiGithub,
		mdiHome,
		mdiMap,
		mdiShieldLock,
		mdiViewDashboard
	} from '@mdi/js';
	import { navigating, page } from '$app/stores';
	import { closeFeedback, feedbackOpenState, openFeedback } from '$lib/stores/feedback.store';
	import { get } from 'svelte/store';

	$: feedbackDialogOpen = $feedbackOpenState;
</script>

<AppLayout areas="'header header' 'aside main'">
	<nav id="primary_nav" slot="nav" class="nav">
		<NavItem path="/" text="Home" icon={mdiHome} currentUrl={$page.url} class="mt-2" />

		<NavItem
			path="/app/dashboard"
			text="Dashboard"
			icon={mdiViewDashboard}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem
			path="/app/locations"
			text="My Locations"
			icon={mdiMap}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem
			path="/app/devices"
			text="My Devices"
			icon={mdiDevices}
			currentUrl={$page.url}
			class="mt-2"
		/>

		<NavItem path="/" text="Data Rules" icon={mdiFunction} currentUrl={$page.url} class="mt-2" />

		<NavItem path="/" text="Permissions" icon={mdiShieldLock} currentUrl={$page.url} class="mt-2" />
		
		<NavItem path="/app/change-log" text="Change Log" icon={mdiGithub} currentUrl={$page.url} class="mt-2" />

		<span class="flex flex-1" />
		<NavItem
			path="/app/settings"
			text="Settings"
			icon={mdiCog}
			currentUrl={$page.url}
			class="mt-2"
		/>
	</nav>

	<Header />

	<main class="scroll-smooth isolate">
		{#if $navigating}
			<div class="flex items-center justify-center h-full">
				<ProgressCircle />
				&nbsp; Loading Content...
			</div>
		{:else}
			<div>
				<slot />
			</div>
		{/if}
	</main>
</AppLayout>

<Dialog open={feedbackDialogOpen} persistent>
	<div slot="title">Have Feedback about this page?</div>
	<div class="flex flex-row gap-2 mb-2 p-4">
		<Button variant="outline">😭</Button>
		<Button variant="outline">😢</Button>
		<Button variant="outline">😞</Button>
		<Button variant="outline">🫤</Button>
		<Button variant="outline">😊</Button>
		<Button variant="outline">😀</Button>
		<Button variant="outline">😁</Button>
	</div>
	<TextField label="Comment" multiline classes={{ root: 'p-4' }} />
	<div slot="actions">
		<Button variant="fill" color="primary" on:click={() => closeFeedback()}>Close</Button>
		<Button variant="fill" color="primary">Submit Feedback</Button>
	</div>
</Dialog>

<style>
	#primary_nav {
		display: flex;
		flex-direction: column;
	}
</style>
