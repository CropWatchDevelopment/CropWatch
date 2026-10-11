<script lang="ts">
	import { CwButton, CwSpinner } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { DeviceSetupFlow } from './device-setup-flow.svelte';
	import { regionLabel } from './setup-messages';

	interface Props {
		flow: DeviceSetupFlow;
		locationName: string;
		onopen: () => void;
		onaddanother: () => void;
		addingAnother?: boolean;
	}

	let { flow, locationName, onopen, onaddanother, addingAnother = false }: Props = $props();

	type TaskState = 'done' | 'active' | 'pending';

	// While the request runs only the availability check (done during lookup)
	// is known; the API reports what actually happened for the rest.
	let tasks = $derived.by((): { id: string; label: string; state: TaskState }[] => {
		const steps = flow.result?.steps;
		if (!steps) {
			return [
				{ id: 'availability', label: m.device_setup_task_availability(), state: 'done' },
				{ id: 'network', label: m.device_setup_task_network_pending(), state: 'active' },
				{
					id: 'saved',
					label: m.device_setup_task_saved({ location: locationName }),
					state: 'pending'
				},
				{ id: 'license', label: m.device_setup_task_license(), state: 'pending' }
			];
		}
		return steps.map((step) => {
			switch (step.key) {
				case 'network':
					return {
						id: step.key,
						label:
							step.outcome === 'created'
								? m.device_setup_task_network_created({ region: regionLabel(step.region) })
								: step.outcome === 'adopted'
									? m.device_setup_task_network_adopted()
									: m.device_setup_task_network_existing(),
						state: 'done'
					};
				case 'saved':
					return {
						id: step.key,
						label:
							step.outcome === 'existing'
								? m.device_setup_task_saved_existing({ location: locationName })
								: m.device_setup_task_saved({ location: locationName }),
						state: 'done'
					};
				case 'license':
					return {
						id: step.key,
						label:
							step.outcome === 'existing'
								? m.device_setup_task_license_existing()
								: step.outcome === 'skipped'
									? m.device_setup_task_license_skipped()
									: m.device_setup_task_license(),
						state: 'done'
					};
				default:
					return { id: step.key, label: m.device_setup_task_availability(), state: 'done' };
			}
		});
	});

	let name = $derived(flow.result?.name ?? flow.name.trim());
</script>

<div class="flex flex-col gap-6">
	{#if flow.step === 'done'}
		<header class="flex flex-col items-start gap-3">
			<span class="done-mark" aria-hidden="true">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg
				>
			</span>
			<h2 class="m-0 text-2xl font-semibold" tabindex="-1" data-step-heading>
				{m.device_setup_done_title({ name })}
			</h2>
			<p class="m-0 text-(--cw-text-muted)">{m.device_setup_done_body()}</p>
		</header>
	{:else}
		<header class="flex flex-col gap-1">
			<h2 class="m-0 text-xl font-semibold" tabindex="-1" data-step-heading>
				{m.device_setup_registering_title({ name })}
			</h2>
			<p class="m-0 text-(--cw-text-muted)">{m.device_setup_registering_body()}</p>
		</header>
	{/if}

	<ol class="tasks" aria-live="polite">
		{#each tasks as task (task.id)}
			<li class:pending={task.state === 'pending'}>
				<span class="task-icon">
					{#if task.state === 'done'}
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--cw-accent)"
							stroke-width="2.4"
							stroke-linecap="round"
							stroke-linejoin="round"
							role="img"
							aria-label={m.device_setup_task_done()}
							><circle cx="12" cy="12" r="10"></circle><path d="m8 12 3 3 5-6"></path></svg
						>
					{:else if task.state === 'active'}
						<CwSpinner size="sm" />
					{:else}
						<span class="task-dot" role="img" aria-label={m.device_setup_task_waiting()}></span>
					{/if}
				</span>
				<span>{task.label}</span>
			</li>
		{/each}
	</ol>

	{#if flow.step === 'done'}
		<div class="flex flex-wrap justify-end gap-3 border-t border-(--cw-border-muted) pt-4">
			<CwButton
				id="device-setup-add-another"
				variant="secondary"
				loading={addingAnother}
				onclick={onaddanother}
			>
				{m.device_setup_add_another()}
			</CwButton>
			<CwButton id="device-setup-open-device" variant="primary" onclick={onopen}>
				{m.device_setup_open_new_device()}
			</CwButton>
		</div>
	{/if}
</div>

<style>
	.done-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		background: var(--cw-accent);
		color: var(--cw-bg-base);
	}

	.tasks {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tasks li {
		display: flex;
		align-items: center;
		gap: var(--cw-space-3);
		padding: var(--cw-space-2) 0;
		font-size: 0.9375rem;
	}

	.tasks li.pending {
		color: var(--cw-text-muted);
	}

	.task-icon {
		display: inline-flex;
		flex: none;
		width: 1.625rem;
		justify-content: center;
	}

	.task-dot {
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 50%;
		border: 2px solid var(--cw-border-default);
	}
</style>
