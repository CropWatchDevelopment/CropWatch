<script lang="ts">
    export let title = "NA"
    export let img = ''
</script>
<div class="flex justify-center">
<div class="bg-[#242327] rounded-sm flex justify-center align-middle text-surface-100 space-x-4 w-11/12 py-3 my-2 drop-shadow-2xl">
    <img src="{img}" alt="{title} icon" class="w-7">
    <p class="text-xl">{title}</p>
</div>
</div>