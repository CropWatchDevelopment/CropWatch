<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const code = new URLSearchParams(window.location.search).get('code');
		const state = new URLSearchParams(window.location.search).get('state');

		fetch('/api/v1/line', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				code,
				state
			})
		})
			.then(async (response) => {
				const contentType = response.headers.get('content-type');
				if (contentType && contentType.includes('application/json')) {
					return response.json();
				} else {
					const text = await response.text();
					throw new Error(`Expected JSON, got: ${text}`);
				}
			})
			.then((data) => {
				console.log('Success:', data);
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	});
</script>
