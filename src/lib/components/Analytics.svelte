<script lang="ts">
	// Google Analytics 4 for app.cropwatch.io.
	//
	// Mounted once in the root layout so it covers every route (including /auth).
	// page_view is emitted on each client-side navigation, and GA's user_id is
	// kept in sync with the logged-in Supabase user so per-user journeys are
	// visible across pages and devices. Set PUBLIC_GA_MEASUREMENT_ID to enable;
	// disabled automatically in dev so local traffic never reaches the property.
	import { afterNavigate } from '$app/navigation';
	import { dev } from '$app/environment';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { getAppContext } from '$lib/appContext.svelte';
	import { initAnalytics, trackPageView, setAnalyticsUser } from '$lib/analytics/gtag';

	const app = getAppContext();

	// env is read inside browser-only callbacks (never at module top level) so it
	// is never touched during SSR/prerender, which $env/dynamic/public forbids.
	const measurementId = () => (dev ? '' : (env.PUBLIC_GA_MEASUREMENT_ID ?? ''));

	// Keep GA's user_id aligned with the session `sub` claim. Re-runs on
	// login / logout / token refresh; no-ops until initAnalytics has run.
	$effect(() => {
		const sub = app.session?.sub ?? null;
		if (measurementId()) setAnalyticsUser(sub);
	});

	// afterNavigate fires on first mount AND every client-side navigation, so one
	// handler covers the initial page view and all subsequent ones.
	afterNavigate(async () => {
		const id = measurementId();
		if (!id) return;
		initAnalytics(id, { userId: app.session?.sub ?? null });
		await tick(); // let <svelte:head><title> update before reading document.title
		trackPageView(page.url.pathname + page.url.search);
	});
</script>
