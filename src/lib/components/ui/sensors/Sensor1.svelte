<script>
	import DarkCard from './../DarkCard.svelte';
    export let data 
</script>
<div class="my-4">
    <p class="text-surface-100">Displaying sensor 1</p>
    <DarkCard title={"Soil Temperature"} value={22} optimalValue={22} unit={'ºC'}/>
</div>
