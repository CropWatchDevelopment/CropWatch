<script>
	import Back from '$lib/components/ui/Back.svelte';
	import RulesImage from '$lib/images/UI/cw_rules.svg';
    import activeImage from '$lib/images/UI/cw-10.svg';
	import Rules from '$lib/components/rules/Rules.svelte';

    export let data;
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={RulesImage} alt="rules icon" class="w-12" />
	<p class="text-surface-100 text-3xl ml-2">Rules and custom alerts</p>
</div>

<div class="my-4 mx-2 flex justify-between">
	<Back />

    <span class="text-sm inline-block align-middle text-center text-white">
        <!-- <img src={activeImage} alt="device" class="w-14 h-14 mr-4" /> -->
            sensor name
    </span>
</div>

<Rules existingRule={undefined} />