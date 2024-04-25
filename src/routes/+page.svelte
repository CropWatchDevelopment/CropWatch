<script>
	import { onMount } from "svelte";


	onMount(async () => {
		const response = await fetch('/api/v1/dashboard');
		const data = await response.json();
		console.log(data);
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<section>
	<h1>  Welcome to this website ...</h1>
</section>
