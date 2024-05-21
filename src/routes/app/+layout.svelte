<script lang="ts">
	import { invalidate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import cw_LogoImage from '$lib/images/UI/cw_Logo.png';
	import { ProgressCircle, Drawer, Button } from 'svelte-ux';
	import { navigating } from '$app/stores';
	import Close from '$lib/images/UI/cw_Close Button.svg';

	export let data;
	$: ({ session, supabase } = data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (!newSession) {
				/**
				 * Queue this as a task so the navigation won't prevent the
				 * triggering function from completing
				 */
				setTimeout(() => {
					goto('/auth/login', { invalidateAll: true });
				});
			}
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});

	const submitLogout = async (): Promise<void> => {
		const { error } = await data.supabase.auth.signOut();
		if (error) {
			console.log(error);
		}
		await goto('/');
	};
	let rightOpen = false;
</script>

<div class="bg-primary text-surface-300 py-2 static">
	<nav>
		<div class="flex justify-between px-4 items-center">
			<!-- HOME/LOGO BUTTON -->
			<div class="w-32">
				<a href="/app">
					<img src={cw_LogoImage} alt="" />
				</a>
			</div>

			<!-- HAMBURGER ICON -->
			<Drawer
				bind:open={rightOpen}
				placement="right"
				class="w-[300px] bg-[#212E23] text-surface-100"
			>
				<div class="pt-12 px-4">
					<div class="w-full text-right">
						<Button on:click={() => (rightOpen = false)} class="w-16"
							><img src={Close} alt="menu hamburger" /></Button
						>
					</div>
					<div class="pl-2">
					<h1 class="text-2xl font-medium">Menu</h1>

						<div class="text-lg mt-12 space-y-2">
							<p>
								<a href="">Locations</a>
							</p>
							<p>
								<a href="">Sensors</a>
							</p>
						</div>
						<div class="text-lg mt-24">
							<form action="" method="post">
								<button type="submit">Sign Out</button>
							</form>
						</div>
					</div>
				</div>
				<div slot="actions">
					<Button on:click={() => (rightOpen = false)}>Close</Button>
				</div>
			</Drawer>
			<Button on:click={() => (rightOpen = true)} class="p-0"
				><div class="w-14">
					<svg
						id="Layer_1"
						data-name="Layer 1"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 300 300"
						><defs
							><style>
								.cls-1 {
									fill: #0dbf34;
								}
							</style></defs
						><title>cw</title><rect
							class="cls-1"
							x="27.92"
							y="66.2"
							width="244.15"
							height="35.66"
						/><rect class="cls-1" x="27.96" y="132.19" width="244.15" height="35.66" /><rect
							class="cls-1"
							x="27.96"
							y="198.18"
							width="244.15"
							height="35.66"
						/></svg
					>
				</div></Button
			>
		</div>
	</nav>
</div>
<div class="app background-gradient">
	{#if $navigating || $isLoading}
		<div
			class="my-auto mx-auto flex flex-col justify-center align-middle items-center text-surface-100"
		>
			<ProgressCircle />
			{#if $isLoading}
				&nbsp; {$_('app.loading_translations_message')}
			{:else}
				&nbsp; {$_('app.loading_message')}
			{/if}
		</div>
	{:else}
		<main>
			<slot />
		</main>
	{/if}
</div>

<style>
	.background-gradient {
		background: rgb(19, 32, 23);
		background: linear-gradient(180deg, rgba(19, 32, 23, 1) 0%, rgba(126, 140, 126, 1) 100%);
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
