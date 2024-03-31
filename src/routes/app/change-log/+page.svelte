<script>
	import { mdiGithub } from "@mdi/js";
    import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import { Icon } from "svelte-ux";
	import { onMount } from "svelte";





    fetch('https://github.com/CropWatchDevelopment/CropWatch/commits.atom', (r) => {
        const feedDocument = new DOMParser().parseFromString(r, 'text/xml')
        debugger;
    })

</script>
<h1
	class="mb-2 flex items-center text-2xl font-bold border-b mb-4 w-full text-white relative"
	style="left:-8px; top:-8px; background-image:url({backgroundImg}); width:100%; height: 100px;"
>
	<div class="flex items-center space-x-2 ml-2">
		<Icon data={mdiGithub} />
		<span>Change Log</span>
	</div>
</h1>
