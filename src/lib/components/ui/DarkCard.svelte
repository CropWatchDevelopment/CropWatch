<script>
    export let title;
    export let value;
    export let optimalValue;

    const differenceValue =  value - optimalValue;

    function checkValue (value) {
        if (value > 0){
            return 'greater'
        } else if (value == 0){
            return 'equal'
        } else {
            return 'less'
        }
    }

</script>
<div class="bg-[#34393f] bg-opacity-50 rounded-lg p-2 text-surface-100" >
    <div class="flex justify-between">
        <p class="text-sm">{title}</p>
        <p class="text-lg">{value}</p>
    </div>
    {#if optimalValue}
    <div>
        <div class="flex justify-between">
            <p class="text-sm">Optimal</p>
            <p class="text-lg" >{optimalValue}</p>
        </div>
        <div class="flex justify-between">
            <p class="text-sm">Difference</p>
            <p class="text-lg {checkValue(differenceValue) == 'greater' ? 'greater':(checkValue(differenceValue) == 'equal' ? '' : 'less')}">{differenceValue > 0 ? '+' : ''}{differenceValue}</p>
        </div>
    </div>
    {/if}
</div>
<style>
    .greater{
        color: greenyellow;
    }
    .less{
        color: red;
    }
</style>