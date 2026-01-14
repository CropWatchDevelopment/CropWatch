<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import CWButton from './CWButton.svelte';
	import BACK_ICON from '$lib/images/icons/back.svg';

	interface Props {
		/** Override the default back navigation target */
		fallback?: string;
		/** Custom label for the button */
		label?: string;
		/** Additional CSS classes */
		class?: string;
	}

	let { fallback, label = 'Back', class: className = '' }: Props = $props();

	/**
	 * Compute the parent route from the current path.
	 * For example: /locations/location/123/devices/device/abc -> /locations/location/123/devices
	 */
	function getParentRoute(pathname: string): string {
		const segments = pathname.split('/').filter(Boolean);
		if (segments.length <= 1) {
			return '/';
		}
		segments.pop();
		return '/' + segments.join('/');
	}

	function handleBack() {
		// First check for prev query param
		const prevParam = page.url.searchParams.get('prev');
		if (prevParam) {
			goto(prevParam);
			return;
		}

		// Then use fallback if provided
		if (fallback) {
			goto(fallback);
			return;
		}

		// Otherwise navigate to parent route
		const parentRoute = getParentRoute(page.url.pathname);
		goto(parentRoute);
	}
</script>

<CWButton
	variant="secondary"
	onclick={handleBack}
	class="px-0 text-slate-400 hover:text-slate-200 {className}"
>
	<img src={BACK_ICON} alt="Back" class="inline h-5 w-5 mr-2" />
	<span>{label}</span>
</CWButton>
