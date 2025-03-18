<script lang="ts">
	import Sidebar from '$lib/components/UI/Sidebar.svelte';
	import Notification from '$lib/components/UI/Notification.svelte';
	import { AppLayout } from 'svelte-ux';
	import Header from '$lib/components/UI/Header.svelte';

	let { children } = $props();
</script>

<AppLayout areas="'header' 'aside main'" classes={{ root: 'h-[calc(100%-64px)]' }}>
	<svelte:fragment slot="nav">
		<Sidebar />
	</svelte:fragment>

	<Header />

	<main class="min-[300px]: flex h-[calc(100%-64px)] flex-col">
		<Notification />
		<section class="h-[calc(100%-64px)] flex-col">
			{@render children()}
		</section>
	</main>
</AppLayout>
