<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { Profile } from '$lib/interfaces/profile.interface';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const toast = useCwToast();
	const app = getAppContext();

	function getProfileSource(): Profile {
		return (
			data.profile ??
			app.profile ?? {
				username: '',
				full_name: '',
				website: '',
				employer: '',
				phone_number: ''
			}
		);
	}

	function getInitialProfile(): Profile {
		const source = getProfileSource();
		return {
			username: source.username ?? '',
			full_name: source.full_name ?? '',
			website: source.website ?? '',
			employer: source.employer ?? '',
			phone_number: source.phone_number ?? ''
		};
	}

	let username = $state(getInitialProfile().username);
	let fullName = $state(getInitialProfile().full_name);
	let website = $state(getInitialProfile().website);
	let employer = $state(getInitialProfile().employer);
	let phoneNumber = $state(getInitialProfile().phone_number);

	const hasWebsiteError = $derived(website.trim().length > 0 && !isLikelyWebsite(website));
	const hasErrors = $derived(hasWebsiteError);
	const isDirty = $derived.by(() => {
		const initialProfile = getInitialProfile();
		return (
			username !== initialProfile.username ||
			fullName !== initialProfile.full_name ||
			website !== initialProfile.website ||
			employer !== initialProfile.employer ||
			phoneNumber !== initialProfile.phone_number
		);
	});
	const displayName = $derived(fullName || username || data.email || 'Your profile');

	function isLikelyWebsite(value: string): boolean {
		try {
			const withProtocol = value.includes('://') ? value : `https://${value}`;
			const url = new URL(withProtocol);
			return url.hostname.includes('.');
		} catch {
			return false;
		}
	}

	function resetForm() {
		const initialProfile = getInitialProfile();
		username = initialProfile.username;
		fullName = initialProfile.full_name;
		website = initialProfile.website;
		employer = initialProfile.employer;
		phoneNumber = initialProfile.phone_number;
	}

	function handleSave() {
		if (hasErrors) {
			toast.add({
				tone: 'danger',
				message: 'Resolve the highlighted fields before wiring this page to the API.'
			});
			return;
		}

		if (!isDirty) {
			toast.add({
				tone: 'info',
				message: 'No profile changes to save yet.'
			});
			return;
		}

		toast.add({
			tone: 'info',
			message: 'Profile save wiring is intentionally deferred until the API endpoint exists.'
		});
	}
</script>

<svelte:head>
	<title>{m.nav_profile()} - CropWatch</title>
</svelte:head>

<AppPage width="lg" class="profile-page">
	<div class="profile-page__shell">
		<CwCard
			title={m.nav_profile()}
			subtitle="Keep the account details used across reports, notifications, and shared views current."
			elevated
		>
			{#snippet actions()}
				<div class="profile-meta">
					{#if data.email}
						<CwChip label={data.email} tone="info" variant="soft" size="sm" />
					{/if}
					{#if data.role}
						<CwChip label={data.role} tone="secondary" variant="outline" size="sm" />
					{/if}
				</div>
			{/snippet}

			<AppFormStack padded>
				<div class="profile-summary">
					<div class="profile-summary__copy">
						<p class="profile-eyebrow">Account profile</p>
						<h2>{displayName}</h2>
						<p>
							Use this page to shape how your identity appears anywhere CropWatch surfaces profile
							data.
						</p>
					</div>

					<div class="profile-highlights">
						<div class="profile-highlight">
							<span class="profile-highlight__label">Employer</span>
							<strong class="profile-highlight__value">{employer || 'Add your company'}</strong>
						</div>
						<div class="profile-highlight">
							<span class="profile-highlight__label">Website</span>
							<strong class="profile-highlight__value">{website || 'Add your website'}</strong>
						</div>
						<div class="profile-highlight">
							<span class="profile-highlight__label">Phone</span>
							<strong class="profile-highlight__value"
								>{phoneNumber || 'Add your phone number'}</strong
							>
						</div>
					</div>
				</div>
			</AppFormStack>
		</CwCard>

		{#if hasWebsiteError}
			<AppNotice tone="warning" title="Check the website field">
				<p>Enter a valid domain or URL before saving this profile preview.</p>
			</AppNotice>
		{/if}

		<form class="profile-form" onsubmit={(event) => event.preventDefault()}>
			<div class="profile-grid">
				<CwCard
					title="Identity"
					subtitle="The details teammates see first when CropWatch references your account."
					elevated
				>
					<AppFormStack padded>
						<CwInput
							label="Username"
							name="username"
							bind:value={username}
							placeholder="e.g. cropwatch-kevin"
							clearable
						/>

						<CwInput
							label="Full name"
							name="full_name"
							bind:value={fullName}
							placeholder="e.g. Kevin Smith"
							clearable
						/>

						<CwInput
							label="Employer"
							name="employer"
							bind:value={employer}
							placeholder="e.g. CropWatch LLC"
							clearable
						/>
					</AppFormStack>
				</CwCard>

				<CwCard
					title="Contact"
					subtitle="Public-facing contact details associated with your profile."
					elevated
				>
					<AppFormStack padded>
						<CwInput
							label="Website"
							name="website"
							bind:value={website}
							placeholder="e.g. https://cropwatch.io"
							clearable
						/>

						<CwInput
							label="Phone number"
							name="phone_number"
							bind:value={phoneNumber}
							placeholder="e.g. +1 555 123 4567"
							clearable
						/>
					</AppFormStack>
				</CwCard>
			</div>

			<CwCard
				title="Preview and actions"
				subtitle="This page still operates on local preview state until the profile API is wired."
				elevated
			>
				<AppFormStack padded>
					<div class="profile-chip-row">
						{#if username}
							<CwChip label={username} tone="secondary" variant="outline" />
						{/if}
						{#if employer}
							<CwChip label={employer} tone="primary" variant="soft" />
						{/if}
						{#if website}
							<CwChip label={website} tone="info" variant="soft" />
						{/if}
					</div>

					<AppActionRow>
						<CwButton type="button" variant="ghost" onclick={resetForm} disabled={!isDirty}>
							Reset
						</CwButton>
						<CwButton
							type="button"
							variant="primary"
							onclick={handleSave}
							disabled={!isDirty || hasErrors}
						>
							Save profile
						</CwButton>
					</AppActionRow>
				</AppFormStack>
			</CwCard>
		</form>
	</div>
</AppPage>

<style>
	.profile-page__shell,
	.profile-form {
		display: grid;
		gap: var(--cw-space-4);
	}

	.profile-meta,
	.profile-chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
	}

	.profile-meta {
		justify-content: flex-end;
	}

	.profile-summary {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
		gap: var(--cw-space-4);
		align-items: start;
	}

	.profile-summary__copy,
	.profile-highlights {
		display: grid;
		gap: var(--cw-space-3);
	}

	.profile-eyebrow {
		margin: 0;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cw-text-tertiary);
	}

	.profile-summary__copy h2,
	.profile-summary__copy p {
		margin: 0;
	}

	.profile-summary__copy h2 {
		font-size: clamp(1.6rem, 1.2rem + 1.4vw, 2.5rem);
		line-height: 1.05;
		color: var(--cw-text-primary);
	}

	.profile-summary__copy p {
		font-size: var(--cw-text-sm);
		line-height: 1.65;
		color: var(--cw-text-secondary);
	}

	.profile-highlight {
		display: grid;
		gap: var(--cw-space-1);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-md);
		background: var(--cw-bg-subtle);
	}

	.profile-highlight__label {
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cw-text-tertiary);
	}

	.profile-highlight__value {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--cw-space-4);
	}

	@media (max-width: 767px) {
		.profile-meta {
			justify-content: flex-start;
		}

		.profile-summary,
		.profile-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
