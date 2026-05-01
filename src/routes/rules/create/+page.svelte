<script lang="ts">
	import RuleForm from '../RuleForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<RuleForm
	mode="create"
	devices={data.devices}
	authToken={data.authToken}
	initialDevEui={data.devEui}
/>
