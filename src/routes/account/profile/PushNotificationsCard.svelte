<script lang="ts">
	// Push is per browser AND per account. This card turns it on for the
	// signed-in account on this browser and lists every device the account
	// receives push on, so a lost or replaced device can be stopped from
	// anywhere. Fully client-driven: it lives outside the preferences <form>,
	// and nothing here is part of the account preferences payload.
	import { onMount } from 'svelte';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import type { PushDeviceDto } from '$lib/api/api.dtos';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatDate, formatDateTime } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import {
		enablePush,
		getPushSupport,
		getThisDeviceId,
		type PushSupport
	} from '$lib/push/push-notifications';

	const app = getAppContext();
	const toast = useCwToast();

	// Support and this browser's id are only knowable in the browser
	// (Notification API, localStorage); render nothing until mounted so SSR
	// and hydration agree.
	let ready = $state(false);
	let support = $state<PushSupport>('unsupported');
	let thisDeviceId = $state<string | null>(null);
	let devices = $state<PushDeviceDto[]>([]);
	let loadFailed = $state(false);
	let busy = $state(false);

	// Kept after the dialog closes so its text doesn't change mid-animation.
	let removal = $state<{ device: PushDeviceDto; isLast: boolean } | null>(null);
	let removalOpen = $state(false);
	let removing = $state(false);

	let enabledHere = $derived(devices.some((device) => device.id === thisDeviceId));

	async function loadDevices() {
		const accessToken = app.accessToken;
		if (!accessToken) return;
		try {
			devices = await new ApiService({ authToken: accessToken }).getPushDevices();
			loadFailed = false;
		} catch (error) {
			console.error('Loading push devices failed:', error);
			loadFailed = true;
		}
	}

	onMount(() => {
		support = getPushSupport();
		void Promise.all([loadDevices(), getThisDeviceId().then((id) => (thisDeviceId = id))]).finally(
			() => (ready = true)
		);
	});

	async function handleEnable() {
		const accessToken = app.accessToken;
		if (!accessToken || busy) return;
		busy = true;

		try {
			if (await enablePush(accessToken)) {
				thisDeviceId = await getThisDeviceId();
				await loadDevices();
				toast.add({ tone: 'success', message: m.push_enabled_toast() });
			}
		} catch (error) {
			console.error('Push enrollment failed:', error);
			toast.add({ tone: 'danger', message: m.push_enable_failed() });
		} finally {
			support = getPushSupport();
			busy = false;
		}
	}

	async function handleRemove() {
		const accessToken = app.accessToken;
		if (!removal || !accessToken || removing) return;
		const { device } = removal;
		removing = true;

		try {
			await new ApiService({ authToken: accessToken }).removePushDevice(device.id);
			removalOpen = false;
			await loadDevices();
			toast.add({
				tone: 'success',
				message: m.push_device_removed_toast({
					device: device.deviceLabel ?? m.push_device_unknown()
				})
			});
		} catch (error) {
			// Already removed from another tab or device: the list was stale.
			if (error instanceof ApiServiceError && error.status === 404) {
				removalOpen = false;
				await loadDevices();
				return;
			}
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(error, m.push_device_remove_failed())
			});
		} finally {
			removing = false;
		}
	}
</script>

<CwCard title={m.push_card_title()} subtitle={m.push_card_subtitle()} elevated>
	{#if ready}
		<AppFormStack padded>
			{#if support === 'ios-needs-install'}
				<AppNotice tone="info">
					<p>{m.push_ios_install_notice()}</p>
				</AppNotice>
			{:else if support === 'unsupported'}
				<AppNotice tone="neutral">
					<p>{m.push_unsupported_notice()}</p>
				</AppNotice>
			{:else if support === 'denied'}
				<AppNotice tone="warning">
					<p>{m.push_denied_notice()}</p>
				</AppNotice>
			{:else if enabledHere}
				<AppNotice tone="success">
					<p>{m.push_enabled_notice()}</p>
				</AppNotice>
			{:else if !loadFailed}
				<AppNotice tone="info">
					<p>{m.push_disabled_notice()}</p>
				</AppNotice>
				<AppActionRow>
					<CwButton
						id="settings-push-enable-button"
						type="button"
						variant="primary"
						loading={busy}
						disabled={!app.accessToken}
						onclick={handleEnable}
					>
						{m.push_enable_action()}
					</CwButton>
				</AppActionRow>
			{/if}

			{#if loadFailed}
				<AppNotice tone="warning">
					<p>{m.push_devices_load_failed()}</p>
				</AppNotice>
			{:else if devices.length > 0}
				<section class="push-devices" aria-labelledby="settings-push-devices-title">
					<h3 id="settings-push-devices-title" class="push-devices__title">
						{m.push_devices_title()}
					</h3>
					<ul class="push-devices__list">
						{#each devices as device (device.id)}
							{@const isThisDevice = device.id === thisDeviceId}
							<li class="push-devices__row">
								<div class="push-devices__info">
									<p class="push-devices__name">
										{device.deviceLabel ?? m.push_device_unknown()}
										{#if isThisDevice}
											<CwChip
												label={m.push_device_this_device()}
												tone="info"
												variant="outline"
												size="sm"
											/>
										{/if}
									</p>
									<p class="push-devices__meta">
										{m.push_device_meta({
											added: formatDate(device.createdAt ?? ''),
											lastOpened: formatDateTime(device.lastSeenAt ?? '')
										})}
									</p>
								</div>
								<CwButton
									id={`settings-push-device-${device.id}-remove-button`}
									type="button"
									variant="secondary"
									size="sm"
									onclick={() => {
										removal = { device, isLast: devices.length === 1 };
										removalOpen = true;
									}}
								>
									{isThisDevice ? m.push_disable_action() : m.action_remove()}
								</CwButton>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</AppFormStack>
	{/if}
</CwCard>

{#if removal}
	{@const label = removal.device.deviceLabel ?? m.push_device_unknown()}
	<CwDialog bind:open={removalOpen} title={m.push_device_remove_title({ device: label })}>
		<p>
			{removal.isLast
				? m.push_device_remove_last_body({ device: label })
				: m.push_device_remove_body({ device: label })}
		</p>

		{#snippet actions()}
			<div class="push-devices__dialog-actions">
				<CwButton
					id="settings-push-device-cancel-button"
					variant="secondary"
					size="md"
					disabled={removing}
					onclick={() => (removalOpen = false)}
				>
					{m.action_cancel()}
				</CwButton>
				<CwButton
					id="settings-push-device-confirm-button"
					variant="danger"
					size="md"
					loading={removing}
					disabled={removing}
					onclick={handleRemove}
				>
					{m.push_device_remove_confirm()}
				</CwButton>
			</div>
		{/snippet}
	</CwDialog>
{/if}

<style>
	.push-devices {
		display: grid;
		gap: var(--cw-space-2);
	}

	.push-devices__title {
		margin: 0;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-secondary);
	}

	.push-devices__list {
		display: grid;
		gap: var(--cw-space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.push-devices__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.push-devices__info {
		min-width: 0;
	}

	.push-devices__name {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
		margin: 0;
		font-weight: var(--cw-font-semibold);
	}

	.push-devices__meta {
		margin: 0;
		font-size: var(--cw-text-xs);
		color: var(--cw-text-secondary);
	}

	.push-devices__dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-1);
	}

	@media (max-width: 639px) {
		.push-devices__row {
			flex-direction: column;
			align-items: stretch;
		}

		.push-devices__dialog-actions {
			flex-direction: column;
		}
	}
</style>
