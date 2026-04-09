<script lang="ts">
	import { createAppContext, setAppContext, type AppContext } from '$lib/appContext.svelte';
	import DashboardDeviceCards, { type CardLayout } from './DashboardDeviceCards.svelte';
	import type { DashboardDeviceFilters } from './device-table';

	interface Props {
		initialApp: Partial<AppContext>;
		filters: DashboardDeviceFilters;
		cardLayout?: CardLayout;
	}

	let { initialApp, filters, cardLayout = 'grid' }: Props = $props();

	const app = $state(createAppContext());
	$effect(() => {
		const nextApp = initialApp as Record<string, unknown>;
		const targetApp = app as unknown as Record<string, unknown>;

		for (const key in nextApp) {
			targetApp[key] = nextApp[key];
		}
	});
	setAppContext(app);
</script>

<DashboardDeviceCards {filters} {cardLayout} />
