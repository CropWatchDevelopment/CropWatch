<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-[url(/images/saito.jpg)] bg-cover bg-center">
    {@render children()}
</div>