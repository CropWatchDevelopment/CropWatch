<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import PushNotificationsCard from './PushNotificationsCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const toast = useCwToast();
	const initial = (() => data)();
	const initialProfile = initial.profile;

	let username = $state(initialProfile?.username ?? '');
	let fullName = $state(initialProfile?.full_name ?? '');
	let employer = $state(initialProfile?.employer ?? '');
	let website = $state(initialProfile?.website ?? '');
	let phoneNumber = $state(initialProfile?.phone_number ?? '');
	let email = $state(initial.email ?? '');

	let savingProfile = $state(false);
	let savingEmail = $state(false);
	let unlinkingLine = $state(false);
	let requestingLineCode = $state(false);

	const LINE_ADD_FRIEND_URL = 'https://line.me/R/ti/p/@cropwatch';

	function isLikelyWebsite(value: string): boolean {
		try {
			const withProtocol = value.includes('://') ? value : `https://${value}`;
			return new URL(withProtocol).hostname.includes('.');
		} catch {
			return false;
		}
	}

	const hasWebsiteError = $derived(website.trim().length > 0 && !isLikelyWebsite(website));
	const emailChanged = $derived(email.trim().length > 0 && email.trim() !== (data.email ?? ''));

	// CropWatch corporate accounts are locked to their email of record. This is a
	// convenience guard only — the API enforces it authoritatively.
	const RESTRICTED_EMAIL_DOMAINS = ['@cropwatch.io', '@cropwatch.co.jp'];
	const emailLocked = RESTRICTED_EMAIL_DOMAINS.some((domain) =>
		(initial.email ?? '').trim().toLowerCase().endsWith(domain)
	);
</script>

<svelte:head>
	<title>{m.nav_profile()} - CropWatch</title>
</svelte:head>

<AppPage width="lg">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back()}
	</CwButton>

	<CwCard title={m.profile_identity_title()} subtitle={m.profile_identity_subtitle()} elevated>
		{#snippet actions()}
			{#if data.role}
				<CwChip label={data.role} tone="secondary" variant="outline" size="sm" />
			{/if}
		{/snippet}

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				savingProfile = true;
				return async ({ result }) => {
					savingProfile = false;
					if (result.type === 'success') {
						toast.add({ tone: 'success', message: m.profile_saved() });
						await goto(resolve('/account/profile'), { invalidateAll: true });
						return;
					}
					await applyAction(result);
					if (result.type === 'failure' && typeof result.data?.error === 'string') {
						toast.add({ tone: 'danger', message: result.data.error });
					}
				};
			}}
		>
			<AppFormStack padded>
				{#if form?.error}
					<AppNotice tone="danger">
						<p>{form.error}</p>
					</AppNotice>
				{/if}

				<CwInput
					label={m.profile_username_label()}
					name="username"
					bind:value={username}
					placeholder="cropwatch-kevin"
					clearable
				/>
				<CwInput
					label={m.profile_full_name_label()}
					name="full_name"
					bind:value={fullName}
					placeholder={m.profile_full_name_placeholder()}
					clearable
				/>
				<CwInput
					label={m.profile_employer_label()}
					name="employer"
					bind:value={employer}
					placeholder={m.profile_employer_placeholder()}
					clearable
				/>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<CwInput
						label={m.profile_website_label()}
						name="website"
						bind:value={website}
						placeholder="https://cropwatch.io"
						error={hasWebsiteError ? m.profile_website_invalid() : undefined}
						clearable
					/>
					<CwInput
						label={m.profile_phone_label()}
						name="phone_number"
						bind:value={phoneNumber}
						placeholder="+1 555 123 4567"
						clearable
					/>
				</div>

				<AppActionRow>
					<CwButton
						type="submit"
						variant="primary"
						loading={savingProfile}
						disabled={hasWebsiteError}
					>
						{m.action_save_changes()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>

	<CwCard title={m.profile_email_title()} subtitle={m.profile_email_subtitle()} elevated>
		<form
			method="POST"
			action="?/updateEmail"
			use:enhance={({ cancel }) => {
				if (emailLocked) {
					cancel();
					toast.add({ tone: 'danger', message: m.profile_email_locked() });
					return;
				}
				savingEmail = true;
				return async ({ result }) => {
					savingEmail = false;
					await applyAction(result);
					if (result.type === 'success') {
						toast.add({ tone: 'info', message: m.profile_email_sent() });
					} else if (result.type === 'failure' && typeof result.data?.emailError === 'string') {
						toast.add({ tone: 'danger', message: result.data.emailError });
					}
				};
			}}
		>
			<AppFormStack padded>
				{#if emailLocked}
					<AppNotice tone="danger">
						<p>{m.profile_email_locked()}</p>
					</AppNotice>
				{/if}
				{#if form?.emailPending}
					<AppNotice tone="info" ariaLive="polite">
						<p>{form.emailMessage ?? m.profile_email_pending()}</p>
					</AppNotice>
				{/if}
				{#if form?.emailError}
					<AppNotice tone="danger">
						<p>{form.emailError}</p>
					</AppNotice>
				{/if}

				<CwInput
					label={m.profile_email_label()}
					name="email"
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					disabled={emailLocked}
				/>

				<AppActionRow>
					<CwButton
						type="submit"
						variant="primary"
						loading={savingEmail}
						disabled={emailLocked || !emailChanged}
					>
						{m.profile_email_send_action()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>

	<CwCard title={m.line_card_title()} subtitle={m.line_card_subtitle()} elevated>
		<AppFormStack padded>
			{#if form?.lineError}
				<AppNotice tone="danger">
					<p>{form.lineError}</p>
				</AppNotice>
			{/if}

			{#if data.lineLinked}
				<AppNotice tone="success">
					<p>{m.line_linked_notice()}</p>
				</AppNotice>

				<form
					method="POST"
					action="?/unlinkLine"
					use:enhance={() => {
						unlinkingLine = true;
						return async ({ result }) => {
							unlinkingLine = false;
							if (result.type === 'success') {
								toast.add({ tone: 'success', message: m.line_unlinked() });
								await goto(resolve('/account/profile'), { invalidateAll: true });
								return;
							}
							await applyAction(result);
							if (result.type === 'failure' && typeof result.data?.lineError === 'string') {
								toast.add({ tone: 'danger', message: result.data.lineError });
							}
						};
					}}
				>
					<AppActionRow>
						<CwButton type="submit" variant="secondary" loading={unlinkingLine}>
							{m.line_unlink_action()}
						</CwButton>
					</AppActionRow>
				</form>
			{:else}
				<AppNotice tone="info">
					<p>{m.line_not_linked_notice()}</p>
				</AppNotice>
				<p>{m.line_code_instructions()}</p>

				{#if form?.lineCode}
					<AppNotice tone="success" ariaLive="polite">
						<p class="line-code">{form.lineCode}</p>
						<p>{m.line_code_send_hint()}</p>
					</AppNotice>
				{/if}

				<form
					method="POST"
					action="?/lineLinkCode"
					use:enhance={() => {
						requestingLineCode = true;
						return async ({ result }) => {
							requestingLineCode = false;
							await applyAction(result);
							if (result.type === 'failure' && typeof result.data?.lineError === 'string') {
								toast.add({ tone: 'danger', message: result.data.lineError });
							}
						};
					}}
				>
					<AppActionRow>
						<CwButton
							variant="secondary"
							onclick={() => window.open(LINE_ADD_FRIEND_URL, '_blank', 'noopener')}
						>
							{m.line_add_friend_action()}
						</CwButton>
						<CwButton type="submit" variant="primary" loading={requestingLineCode}>
							{form?.lineCode ? m.line_code_refresh_action() : m.line_code_action()}
						</CwButton>
					</AppActionRow>
				</form>
			{/if}
		</AppFormStack>
	</CwCard>

	<PushNotificationsCard />
</AppPage>

<style>
	.line-code {
		font-family: monospace;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		margin: 0;
	}
</style>
