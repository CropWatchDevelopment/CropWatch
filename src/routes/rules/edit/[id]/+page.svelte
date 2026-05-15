<script lang="ts">
	import RuleForm from '../../RuleForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<RuleForm mode="edit" devices={data.devices} authToken={data.authToken} rule={data.rule} />
