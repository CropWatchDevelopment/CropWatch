<script lang="ts">
	export let text: string = '';
    export let twBgColor: string = 'bg-blue-400';
    export let twTextColor: string = 'text-gray-800';
</script>

<div
	style="padding-top: 0.1em; padding-bottom: 0.1rem"
	class="text-xs px-3 {twBgColor} {twTextColor} rounded-full w-fit"
>
	{text}
</div>
