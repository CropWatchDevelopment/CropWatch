<script lang="ts">
	// Push enrollment is a property of THIS browser/device (permission + FCM
	// token), so unlike every other settings section this card is fully
	// client-driven and lives outside the preferences <form> — nothing here is
	// part of the account preferences payload.
	import { onMount } from 'svelte';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, useCwToast } from '@cropwatchdevelopment/cwui';
	import {
		disablePush,
		enablePush,
		getPushStatus,
		type PushStatus
	} from '$lib/push/push-notifications';

	const app = getAppContext();
	const toast = useCwToast();

	// Status is only knowable in the browser (Notification API, localStorage);
	// render nothing until mounted so SSR and hydration agree.
	let ready = $state(false);
	let status = $state<PushStatus>('disabled');
	let busy = $state(false);

	onMount(() => {
		status = getPushStatus();
		ready = true;
	});

	async function handleEnable() {
		const accessToken = app.accessToken;
		if (!accessToken || busy) return;
		busy = true;

		try {
			status = await enablePush(accessToken);
			if (status === 'enabled') {
				toast.add({ tone: 'success', message: m.push_enabled_toast() });
			}
		} catch (error) {
			console.error('Push enrollment failed:', error);
			status = getPushStatus();
			toast.add({ tone: 'danger', message: m.push_enable_failed() });
		} finally {
			busy = false;
		}
	}

	async function handleDisable() {
		const accessToken = app.accessToken;
		if (!accessToken || busy) return;
		busy = true;

		try {
			await disablePush(accessToken);
			status = getPushStatus();
			toast.add({ tone: 'success', message: m.push_disabled_toast() });
		} catch (error) {
			console.error('Push disable failed:', error);
			status = getPushStatus();
		} finally {
			busy = false;
		}
	}
</script>

<CwCard title={m.push_card_title()} subtitle={m.push_card_subtitle()} elevated>
	{#if ready}
		<AppFormStack padded>
			{#if status === 'ios-needs-install'}
				<AppNotice tone="info">
					<p>{m.push_ios_install_notice()}</p>
				</AppNotice>
			{:else if status === 'unsupported'}
				<AppNotice tone="neutral">
					<p>{m.push_unsupported_notice()}</p>
				</AppNotice>
			{:else if status === 'denied'}
				<AppNotice tone="warning">
					<p>{m.push_denied_notice()}</p>
				</AppNotice>
			{:else if status === 'enabled'}
				<AppNotice tone="success">
					<p>{m.push_enabled_notice()}</p>
				</AppNotice>
				<AppActionRow>
					<CwButton
						id="settings-push-disable-button"
						type="button"
						variant="secondary"
						loading={busy}
						onclick={handleDisable}
					>
						{m.push_disable_action()}
					</CwButton>
				</AppActionRow>
			{:else}
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
		</AppFormStack>
	{/if}
</CwCard>
