<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { AppNotice } from '$lib/components/layout';
	import { formatHexPairs } from '$lib/devices/eui';
	import { m } from '$lib/paraglide/messages.js';
	import type { SetupFailure } from './device-setup-flow.svelte';
	import { supportHref } from './setup-messages';

	interface Props {
		failure: SetupFailure;
		devEui: string;
		onretry: () => void;
		onchangeidentity: () => void;
		onchangelicense: () => void;
		onopenlocation: () => void;
	}

	let { failure, devEui, onretry, onchangeidentity, onchangelicense, onopenlocation }: Props =
		$props();

	type Action = { id: string; label: string; primary?: boolean; run: () => void };

	const contactSupport = (): void => {
		window.location.href = supportHref(failure.reference, devEui);
	};

	// One explanation and the actions that resolve it, per outcome.
	let outcome = $derived.by(() => {
		const support: Action = {
			id: 'support',
			label: m.device_setup_contact_support(),
			run: contactSupport
		};
		const retry: Action = {
			id: 'retry',
			label: m.device_setup_retry(),
			primary: true,
			run: onretry
		};
		switch (failure.code) {
			case 'DEVICE_OWNED_BY_OTHER_ACCOUNT':
				return {
					tone: 'danger' as const,
					title: m.device_setup_owned_other_title(),
					body: m.device_setup_owned_other_body({ dev_eui: formatHexPairs(devEui) }),
					actions: [
						{ ...support, primary: true },
						{ id: 'identity', label: m.device_setup_check_dev_eui(), run: onchangeidentity }
					]
				};
			case 'DEVICE_ALREADY_YOURS': {
				const name = String(failure.details.name ?? '');
				const locationId = failure.details.location_id;
				return {
					tone: 'warning' as const,
					title: m.device_setup_already_yours_title(),
					body: m.device_setup_already_yours_body({
						name,
						location: String(failure.details.location_name ?? '—')
					}),
					actions:
						typeof locationId === 'number'
							? [
									{
										id: 'open',
										label: m.device_setup_open_device({ name }),
										primary: true,
										run: () =>
											goto(
												resolve('/locations/[location_id]/devices/[dev_eui]', {
													location_id: String(locationId),
													dev_eui: devEui
												})
											)
									}
								]
							: []
				};
			}
			case 'NETWORK_UNAVAILABLE':
				return {
					tone: 'danger' as const,
					title: m.device_setup_network_unavailable_title(),
					body: m.device_setup_network_unavailable_body(),
					actions: [retry, support]
				};
			case 'NETWORK_EUI_CLAIMED_ELSEWHERE':
				return {
					tone: 'danger' as const,
					title: m.device_setup_claimed_elsewhere_title(),
					body: m.device_setup_claimed_elsewhere_body(),
					actions: [{ ...support, primary: true }]
				};
			case 'SETUP_IN_PROGRESS':
				return {
					tone: 'warning' as const,
					title: m.device_setup_in_progress_title(),
					body: m.device_setup_in_progress_body(),
					actions: [
						{
							id: 'location',
							label: m.device_setup_open_location(),
							primary: true,
							run: onopenlocation
						}
					]
				};
			case 'NETWORK_DEVICE_UNVERIFIABLE':
				return {
					tone: 'warning' as const,
					title: m.device_setup_unverifiable_title(),
					body: m.device_setup_unverifiable_body(),
					actions: [{ ...support, primary: true }]
				};
			case 'NETWORK_MODEL_MISMATCH':
				return {
					tone: 'warning' as const,
					title: m.device_setup_model_mismatch_title(),
					body: m.device_setup_model_mismatch_body(),
					actions: [
						{
							id: 'model',
							label: m.device_setup_change_model(),
							primary: true,
							run: onchangeidentity
						},
						support
					]
				};
			case 'RATE_LIMITED':
				return {
					tone: 'warning' as const,
					title: m.device_setup_rate_limited_title(),
					body: m.device_setup_rate_limited(),
					actions: []
				};
			case 'MODEL_NOT_AVAILABLE_IN_REGION':
				return {
					tone: 'warning' as const,
					title: m.device_setup_model_unavailable_title(),
					body: m.device_setup_model_unsupported(),
					actions: [
						{
							id: 'model',
							label: m.device_setup_change_model(),
							primary: true,
							run: onchangeidentity
						},
						support
					]
				};
			case 'LICENSE_UNAVAILABLE':
			case 'LICENSE_REQUIRED':
				return {
					tone: 'warning' as const,
					title: m.device_setup_license_unavailable_title(),
					body: m.device_setup_license_unavailable_body(),
					actions: [
						{ id: 'license', label: m.device_setup_change(), primary: true, run: onchangelicense },
						{
							id: 'billing',
							label: m.device_setup_add_licenses(),
							run: () => goto(resolve('/account/billing'))
						}
					]
				};
			case 'FORBIDDEN':
				return {
					tone: 'danger' as const,
					title: m.device_setup_forbidden_title(),
					body: m.device_setup_forbidden_body(),
					actions: []
				};
			default:
				return {
					tone: 'danger' as const,
					title: m.device_setup_failed_title(),
					body: m.device_setup_failed_body(),
					actions: [retry, support]
				};
		}
	});
</script>

<AppNotice tone={outcome.tone} title={outcome.title} ariaLive="polite">
	<p>{outcome.body}</p>
	{#if outcome.actions.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each outcome.actions as action (action.id)}
				<CwButton
					id={`device-setup-outcome-${action.id}`}
					size="sm"
					variant={action.primary ? 'primary' : 'secondary'}
					onclick={action.run}
				>
					{action.label}
				</CwButton>
			{/each}
		</div>
	{/if}
	{#if failure.reference}
		<p class="m-0 text-xs text-(--cw-text-muted)">
			{m.device_setup_error_reference({ reference: failure.reference })}
		</p>
	{/if}
</AppNotice>
