<script lang="ts">
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';

	let {
		onToggleDownload,
		onOpenSettings
	}: {
		onToggleDownload: () => void;
		onOpenSettings: () => void;
	} = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-row w-full items-center gap-3">
		<CWBackButton fallback="/locations" />

		<span class="flex flex-grow"></span>

		<CWButton variant="secondary" onclick={onToggleDownload}>
			<img src={DOWNLOAD_ICON} alt="Download data" class="h-4 w-4" />
			Download Data
		</CWButton>

		<CWButton variant="secondary" onclick={onOpenSettings}>
			<img src={SETTINGS_ICON} alt="Go back" class="h-4 w-4" />
			Settings
		</CWButton>
	</div>
</div>
