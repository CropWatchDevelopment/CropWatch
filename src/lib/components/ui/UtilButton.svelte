<script lang="ts">
    export let title = "NA"
    export let img = ''
    export let href = '/'
</script>
<div class="flex justify-center">
<a href="{href}" class="bg-[#242327] rounded-sm flex justify-center align-middle text-surface-100 space-x-4 w-11/12 md:w-1/2 py-2 my-2 drop-shadow-2xl">
    <img src="{img}" alt="{title} icon" class="w-5">
    <p class="text-md">{title}</p>
</a>
</div>