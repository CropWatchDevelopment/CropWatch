<script>
	import { onMount } from 'svelte';
	import { mdiLogout } from '@mdi/js';
	import { Icon, ProgressCircle, Duration, TweenedValue } from 'svelte-ux';

	export let data;
	let countdown = 3;

	onMount(() => {
		const interval = setInterval(() => {
			if (countdown > 0) {
				countdown--;
			} else {
				clearInterval(interval);
				data.supabase.auth.signOut();
				window.location.href = '/auth/login'; // Redirect after logout
			}
		}, 1000);
	});
</script>

<div class="logout-container">
	<Icon data={mdiLogout} class="logout-icon" />
	<p>You are being logged out, Please wait while we direct you back to the login page.</p>
	<ProgressCircle />
	<TweenedValue value={countdown} format="integer" />
</div>

<style>
	.logout-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-size: 1.5rem;
	}
</style>
