<script>
	import { goto } from "$app/navigation";
	import { mdiCog, mdiHistory, mdiLock } from "@mdi/js";
	import { Button } from "svelte-ux";
    import RulesImage from '$lib/images/UI/cw_rules.svg';

</script>
<div class="flex flex-col w-full my-8 gap-4">
	<Button classes={{ root: 'w-full' }} size="lg" icon={mdiHistory} variant="fill">History</Button>
	<Button classes={{ root: 'w-full' }} size="lg" icon={mdiCog} variant="fill">Settings</Button>
	<Button classes={{ root: 'w-full' }} on:click={() => goto('rules')} size="lg" variant="fill">
		<img src={RulesImage} alt="Rules" class="w-6 h-6 mr-2" />
		Rules and Custom Alerts
	</Button>
	<Button classes={{ root: 'w-full' }} size="lg" icon={mdiLock} variant="fill" on:click={() => goto('permissions')}>Permissions</Button>
</div>
