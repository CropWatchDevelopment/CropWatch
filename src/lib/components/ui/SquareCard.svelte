<script lang="ts">
    export let title;
    export let value;
    export let unit;
    export let message;
</script>

<div class="bg-[#34393f] bg-opacity-50 rounded-xl px-3 py-6 text-surface-100 m-[0.3rem] w-[10.5rem] h-[10.5rem]">
    <p class="text-[#4FDE6F] font-medium text-sm">{title}</p>
    <p class="text-4xl my-4">{value}<span class="text-2xl">{unit}</span></p>
    <p class="mt-6 text-sm text-[#7C7886]">{message}</p>
</div>
