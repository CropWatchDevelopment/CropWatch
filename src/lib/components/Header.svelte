<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from './theme/ThemeToggle.svelte';
	let { userName } = $props();

	// Simplified logout function
	function handleLogout() {
		console.log('Logging out user:', userName);

		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		})
			.then(() => {
				console.log('Server logout successful');
				// Redirect to login page
				goto('/auth/login');
			})
			.catch((err) => {
				console.error('Server logout error:', err);
				// Redirect anyway
				goto('/auth/login');
			});
	}

	// Simple log when userName changes for debugging
	$effect(() => {
		console.log('Header userName updated:', userName);
	});
</script>

<header class="dashboard-header bg-cyan-800 p-4 pt-1 pb-2 text-white">
	<h1 class="">IoT Dashboard</h1>
	<div class="user-controls">
		<span class="welcome-user">Welcome, {userName}</span>
		<ThemeToggle />
		<button class="logout-button !px-3 !py-1" onclick={handleLogout}> Logout </button>
	</div>
</header>

<style>
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		/* margin-bottom: 20px; */
	}

	.user-controls {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.welcome-user {
		font-weight: 500;
	}

	.logout-button {
		background-color: #f44336;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.logout-button:hover {
		background-color: #d32f2f;
	}
</style>
