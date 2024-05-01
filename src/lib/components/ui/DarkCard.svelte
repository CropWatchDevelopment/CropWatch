<script>
    export let title = "title";
    export let temperature = 24
    export let data
</script>
<div class="bg-[#34393f] bg-opacity-50 rounded-lg p-2 text-surface-100" >
    {#if data.soilTemperature}
    <div class="flex justify-between">
        <p class="text-sm">Soil Temperature</p>
        <p class="text-lg">{data.soilTemperature}</p>
    </div>
    {/if}
</div>