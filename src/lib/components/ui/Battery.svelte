<script lang='ts'>
    export let battery;
    function batteryIndicator(value: number){
        if (value < 30){
            return 'empty'
        } else if (value < 70){
            return 'medium'
        } else {
            return 'full'
        }
    }
    const batteryPercentage = `${battery}%`
</script>
<div class="w-24 h-1">
    <div class="flex items-center space-x-1">
        <p class="text-[0.7rem] w-8">{battery}%</p>
        <div class="{batteryIndicator(battery)}" style="width: {batteryPercentage};"></div>
    </div>
</div>
<style>
    .full{
        background-color: rgb(53, 213, 53);
        height: 0.4rem;
        width: 0.5rem;
        border-radius: 1rem;
        color: #868686;
    }
    .medium{
        background-color: rgb(255, 227, 71);
        width: 0.5rem;
        height: 0.4rem;
        border-radius: 1rem;
    }
    .empty{
        background-color: rgb(239, 71, 71);
        width: 0.5rem;
        height: 0.4rem;
        border-radius: 1rem;
    }
</style>