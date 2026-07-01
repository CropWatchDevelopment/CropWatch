<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
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
					placeholder="Kevin Smith"
					clearable
				/>
				<CwInput
					label={m.profile_employer_label()}
					name="employer"
					bind:value={employer}
					placeholder="CropWatch LLC"
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
					} else if (
						result.type === 'failure' &&
						typeof result.data?.emailError === 'string'
					) {
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
</AppPage>
