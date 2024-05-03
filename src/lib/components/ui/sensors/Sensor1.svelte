<script>
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
    export let data 
</script>
<div class="my-4">
    <p class="text-surface-100">Displaying sensor 1</p>
    <TempHumidityCard temperature={24.5} humidity={50}/>
    <DarkCard title={"Soil Temperature"} value={22} optimalValue={22} unit={'ºC'}/>
    <DarkCard title={"Soil Temperature"} value={22} optimalValue={22} unit={'ºC'}/>
    <DarkCard title={"Soil Temperature"} value={22} optimalValue={22} unit={'ºC'}/>
    <DarkCard title={"Soil Temperature"} value={22} optimalValue={22} unit={'ºC'}/>
</div>
