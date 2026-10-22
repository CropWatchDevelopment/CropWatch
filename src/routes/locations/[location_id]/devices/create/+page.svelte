<script lang="ts">
	import { AppPage } from '$lib/components/layout';
	import { tick } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CwButton, CwCard, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { getServices } from '$lib/services/context';
	import DetailsStep from './DetailsStep.svelte';
	import IdentifyStep from './IdentifyStep.svelte';
	import RegisterProgress from './RegisterProgress.svelte';
	import ReviewStep from './ReviewStep.svelte';
	import { DeviceSetupFlow } from './device-setup-flow.svelte';
	import { regionLabel } from './setup-messages';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { devices } = getServices();
	const toast = useCwToast();
	const locationId = (() => data.locationId)();
	const flow = new DeviceSetupFlow({
		devices,
		locationId: Number(locationId),
		licenses: (() => data.availableLicenses)()
	});

	const locationHref = resolve('/locations/[location_id]', { location_id: locationId });

	const STEP_ORDER = ['identify', 'details', 'review'] as const;
	let currentIndex = $derived(
		flow.step === 'registering' || flow.step === 'done'
			? STEP_ORDER.length
			: STEP_ORDER.indexOf(flow.step)
	);
	let steps = $derived([
		m.device_setup_step_identify(),
		m.device_setup_step_details(),
		m.device_setup_step_review()
	]);

	// Keep the selected license valid whenever the free licenses are reloaded.
	$effect(() => {
		flow.syncLicenses(data.availableLicenses);
	});

	// A finished setup used a license: refresh the count.
	$effect(() => {
		if (flow.step === 'done') {
			invalidateAll().catch((error: unknown) =>
				console.error('Failed to reload the available licenses:', error)
			);
		}
	});

	// Move focus to the new step's heading so keyboard and screen-reader users
	// follow the wizard.
	let previousStep = flow.step;
	$effect(() => {
		const step = flow.step;
		if (step === previousStep) return;
		previousStep = step;
		void tick().then(() =>
			document.querySelector<HTMLElement>('[data-step-heading]')?.focus({ preventScroll: false })
		);
	});

	/** The free licenses could not be reloaded: the wizard goes on with the list it has. */
	function licensesNotReloaded(error: unknown): void {
		console.error('Failed to reload the available licenses:', error);
		toast.add({ tone: 'warning', message: m.device_setup_licenses_reload_failed() });
	}

	// The chosen license was taken meanwhile: reload the free ones first.
	async function changeLicense(): Promise<void> {
		try {
			await invalidateAll();
		} catch (error) {
			licensesNotReloaded(error);
		} finally {
			flow.go('details');
		}
	}

	let addingAnother = $state(false);
	async function addAnother(): Promise<void> {
		addingAnother = true;
		try {
			await invalidateAll();
		} catch (error) {
			licensesNotReloaded(error);
		} finally {
			addingAnother = false;
			flow.reset(data.availableLicenses);
		}
	}
</script>

<svelte:head>
	<title>{m.device_setup_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton
		id="device-setup-back-button"
		variant="secondary"
		size="sm"
		onclick={() => goto(locationHref)}
	>
		&larr; {m.action_back()}
	</CwButton>

	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="m-0 text-3xl font-semibold">{m.device_setup_page_title()}</h1>
			<p class="m-0 text-(--cw-text-muted)">
				{#if data.locationRegion || flow.currentLookup?.region}
					{m.device_setup_subtitle({
						location: data.locationName,
						region: regionLabel(data.locationRegion ?? flow.currentLookup?.region)
					})}
				{:else}
					{data.locationName}
				{/if}
			</p>
		</div>
		<p class="license-pill m-0">
			{m.device_setup_licenses_available({ count: data.availableLicenses.length })}
		</p>
	</div>

	<nav aria-label={m.device_setup_progress_label()} class="stepper">
		<ol>
			{#each steps as label, index (label)}
				{@const state =
					index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming'}
				<li
					class="stepper__item stepper__item--{state}"
					aria-current={state === 'active' ? 'step' : undefined}
				>
					<span class="stepper__dot" aria-hidden="true">
						{#if state === 'done'}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg
							>
						{:else}
							{index + 1}
						{/if}
					</span>
					<span>{label}</span>
				</li>
			{/each}
		</ol>
	</nav>

	<div class="flex flex-wrap items-start gap-6">
		<div class="min-w-0 flex-[999_1_34rem]">
			<CwCard elevated>
				<div class="setup-card">
					{#if flow.step === 'identify'}
						<IdentifyStep
							{flow}
							deviceTypeOptions={data.deviceTypeOptions}
							oncancel={() => goto(locationHref)}
						/>
					{:else if flow.step === 'details'}
						<DetailsStep
							{flow}
							licenses={data.availableLicenses}
							groupSuggestions={data.groupSuggestions}
							locationLat={data.locationLat}
							locationLong={data.locationLong}
						/>
					{:else if flow.step === 'review'}
						<ReviewStep
							{flow}
							deviceTypeOptions={data.deviceTypeOptions}
							licenses={data.availableLicenses}
							locationName={data.locationName}
							onchangelicense={() => void changeLicense()}
							onopenlocation={() => goto(locationHref)}
						/>
					{:else}
						<RegisterProgress
							{flow}
							locationName={data.locationName}
							onopen={() =>
								goto(
									resolve('/locations/[location_id]/devices/[dev_eui]', {
										location_id: locationId,
										dev_eui: flow.result?.dev_eui ?? flow.devEui.value
									}),
									{ invalidateAll: true }
								)}
							{addingAnother}
							onaddanother={() => void addAnother()}
						/>
					{/if}
				</div>
			</CwCard>
		</div>

		<aside class="flex flex-[1_1_16rem] flex-col gap-4">
			<section class="side-panel">
				<h2 class="m-0 text-base font-semibold">{m.device_setup_how_title()}</h2>
				<ol class="m-0 flex flex-col gap-2 pl-5 text-sm">
					<li>{m.device_setup_how_1()}</li>
					<li>{m.device_setup_how_2()}</li>
					<li>{m.device_setup_how_3()}</li>
				</ol>
				<p class="m-0 text-sm text-(--cw-text-muted)">{m.device_setup_how_safe()}</p>
			</section>
			<section class="side-panel">
				<h2 class="m-0 text-base font-semibold">{m.device_setup_where_title()}</h2>
				<p class="m-0 text-sm text-(--cw-text-muted)">{m.device_setup_where_body()}</p>
			</section>
		</aside>
	</div>
</AppPage>

<style>
	.license-pill {
		padding: var(--cw-space-2) var(--cw-space-4);
		border: 1px solid var(--cw-border-muted);
		border-radius: 999px;
		background: var(--cw-bg-surface);
		font-size: 0.875rem;
	}

	.stepper ol {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-3) var(--cw-space-6);
		margin: 0;
		padding: var(--cw-space-4) var(--cw-space-5);
		list-style: none;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface);
	}

	.stepper__item {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--cw-text-muted);
	}

	.stepper__dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: 1.5px solid var(--cw-border-default);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.stepper__item--active {
		color: var(--cw-text-primary, inherit);
	}

	.stepper__item--active .stepper__dot {
		border-color: var(--cw-accent);
		color: var(--cw-accent);
	}

	.stepper__item--done .stepper__dot {
		border-color: var(--cw-accent);
		background: var(--cw-accent);
		color: var(--cw-bg-base);
	}

	.setup-card {
		padding: var(--cw-space-2);
	}

	.side-panel {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		padding: var(--cw-space-5);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-surface);
	}
</style>
