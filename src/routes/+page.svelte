<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import tractor from '$lib/images/UI/tractor.svg';

	if(browser) goto('/auth/login');
</script>

<div class="flex flex-col w-screen h-screen text-center justify-center">
		<img src={tractor} alt="loading..." class="w-14 mx-auto" /> loading...
</div>
