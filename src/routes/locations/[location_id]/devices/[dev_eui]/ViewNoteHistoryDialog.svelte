<script lang="ts">
	import Icon from "$lib/components/Icon.svelte";
	import { CwButton } from "@cropwatchdevelopment/cwui";

    let open: boolean = $state(false);

</script>

<CwButton onclick={() => (open = true)}>
    <Icon src={NOTES_ICON} alt="Notes" />
    Notes
</CwButton>