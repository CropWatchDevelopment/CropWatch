<script lang="ts">
	import type { DeviceWithType } from '$lib/models/Device';
	import { _ } from 'svelte-i18n';

	type Props = {
		device?: DeviceWithType;
		class?: string;
	};

	let { device, class: className = '' }: Props = $props();
</script>

{#if device?.ip_log.length}
	<section class={className}>
		<h2>{$_('Camera Stream')}</h2>
		{#if device?.ip_log.length > 0}
			{#each device.ip_log as log}
				<img
					class="sc-hHOBiw eJjIgh"
					src="https://153.137.8.13:2223/mjpg/video.mjpg?camera=1&amp;audiocodec=aac&amp;audiosamplerate=16000&amp;audiobitrate=32000&amp;videozprofile=classic&amp;timestamp=0&amp;cachebust=1"
					alt="Camera Stream"
				/>
			{/each}
		{:else}
			<p class="pt-4 text-center text-gray-500 italic">{$_('No stream available')}</p>
		{/if}
	</section>
{/if}
