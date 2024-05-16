<script lang='ts'>
    export let battery = 100;
    function batteryIndicator(value: number){
        if (value < 30){
            return 'empty'
        } else if (value < 70){
            return 'medium'
        } else {
            return 'full'
        }
    }
</script>
<div class="w-24 h-24">
    <div class="{batteryIndicator(battery)} w-24 h-[{battery}%]"></div>
</div>
<style>
    .full{
        background-color: green;
    }
    .medium{
        background-color: yellow;
    }
    .empty{
        background-color: red;
    }
</style>