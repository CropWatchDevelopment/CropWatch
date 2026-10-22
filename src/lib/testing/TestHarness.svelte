<!--
  @component
  Test-only root: provides the contexts the root layout provides in the app
  (services, app context, toasts), then renders the component under test.
  Use it through `renderWithServices` in `$lib/testing/render`.
-->
<script module lang="ts">
	import type { createCwToastContext } from '@cropwatchdevelopment/cwui';
	import type { AppContext } from '$lib/appContext.svelte';

	export interface HarnessHandles {
		app: AppContext;
		toast: ReturnType<typeof createCwToastContext>;
	}
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import { createCwToastContext as createToastContext } from '@cropwatchdevelopment/cwui';
	import { createAppContext, setAppContext } from '$lib/appContext.svelte';
	import type { AppServices } from '$lib/services/app-services';
	import { setServices } from '$lib/services/context';

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any component under test
		component: Component<any>;
		componentProps: Record<string, unknown>;
		services: AppServices;
		app?: Partial<AppContext>;
		onReady: (handles: HarnessHandles) => void;
	}

	let {
		component: UnderTest,
		componentProps,
		services,
		app: initialApp,
		onReady
	}: Props = $props();

	// Captured once, as in the real root layout: the contexts are fixed for the
	// lifetime of the tree.
	const toast = createToastContext();
	const app = $state(createAppContext((() => initialApp ?? {})()));
	setAppContext(app);
	setServices((() => services)());
	(() => onReady)()({ app, toast });
</script>

<UnderTest {...componentProps} />
