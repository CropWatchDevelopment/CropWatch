<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwChip,
		CwInput,
		CwSeparator,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { Profile } from '$lib/interfaces/profile.interface';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const toast = useCwToast();

	function getInitialProfile(): Profile {
		return data.profile;
	}

	let username = $state(getInitialProfile().username);
	let fullName = $state(getInitialProfile().full_name);
	let website = $state(getInitialProfile().website);
	let employer = $state(getInitialProfile().employer);
	let phoneNumber = $state(getInitialProfile().phone_number);

	const usernameTrimmed = $derived(username.trim());
	const fullNameTrimmed = $derived(fullName.trim());
	const websiteTrimmed = $derived(website.trim());
	const employerTrimmed = $derived(employer.trim());
	const phoneNumberTrimmed = $derived(phoneNumber.trim());

	const usernameError = $derived(
		usernameTrimmed.length > 0 && usernameTrimmed.length < 3
			? 'Username must be at least 3 characters.'
			: ''
	);

	const websiteError = $derived(
		websiteTrimmed.length > 0 && !isLikelyWebsite(websiteTrimmed)
			? 'Enter a valid website or leave this field blank.'
			: ''
	);

	const hasErrors = $derived(Boolean(usernameError || websiteError));
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

	const displayName = $derived(fullNameTrimmed || usernameTrimmed || data.email || 'Your profile');
	const companyLabel = $derived(employerTrimmed || 'Add your company');
	const websiteLabel = $derived(websiteTrimmed || 'Add your website');
	const phoneLabel = $derived(phoneNumberTrimmed || 'Add your phone number');

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

<div class="profile-page overflow-y-scroll">
	<div class="profile-card">
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

			<div class="profile-intro">
				<div class="profile-summary">
					<p class="summary-eyebrow">Account profile</p>
					<h2>{displayName}</h2>
					<p>
						Use this page to shape how your identity appears anywhere CropWatch surfaces profile
						data.
					</p>
				</div>

				<div class="profile-highlights">
					<div class="highlight">
						<span class="highlight-label">Employer</span>
						<strong>{companyLabel}</strong>
					</div>
					<div class="highlight">
						<span class="highlight-label">Website</span>
						<strong>{websiteLabel}</strong>
					</div>
					<div class="highlight">
						<span class="highlight-label">Phone</span>
						<strong>{phoneLabel}</strong>
					</div>
				</div>
			</div>

			<CwSeparator spacing="0" />

			<form class="profile-form" onsubmit={(event) => event.preventDefault()}>
				<div class="profile-grid">
					<div class="profile-section">
						<p class="section-title">Identity</p>
						<p class="section-copy">
							These details are the ones teammates will see first when the app references your
							account.
						</p>

						<CwInput
							label="Username"
							name="username"
							bind:value={username}
							placeholder="e.g. cropwatch-kevin"
							error={usernameError}
							clearable
						/>

						<CwInput
							label="Full Name"
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
					</div>

					<div class="profile-section">
						<p class="section-title">Contact</p>
						<p class="section-copy">
							Use the fields below for the public-facing contact details associated with your
							profile.
						</p>

						<CwInput
							label="Website"
							name="website"
							bind:value={website}
							placeholder="e.g. https://cropwatch.io"
							error={websiteError}
							clearable
						/>

						<CwInput
							label="Phone Number"
							name="phone_number"
							bind:value={phoneNumber}
							placeholder="e.g. +1 555 123 4567"
							clearable
						/>
					</div>
				</div>

				<CwSeparator spacing="0" />

				<div class="profile-actions">
					<CwButton type="button" variant="ghost" onclick={resetForm} disabled={!isDirty}>
						Reset
					</CwButton>
					<CwButton
						type="button"
						variant="primary"
						onclick={handleSave}
						disabled={!isDirty || hasErrors}
					>
						Save Profile
					</CwButton>
				</div>
			</form>
		</CwCard>
	</div>
</div>

<style>
	.profile-page {
		padding: 1rem;
		width: 100%;
		min-height: 100%;
	}

	.profile-card {
		width: min(100%, 72rem);
		margin: 0 auto;
	}

	.profile-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.profile-intro {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
		gap: 1.5rem;
		align-items: start;
		margin-bottom: 1.5rem;
	}

	.profile-summary {
		display: grid;
		gap: 0.65rem;
	}

	.summary-eyebrow {
		margin: 0;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--cw-text-tertiary);
	}

	.profile-summary h2 {
		margin: 0;
		font-size: clamp(1.6rem, 1.2rem + 1.4vw, 2.5rem);
		line-height: 1.05;
		color: var(--cw-text-primary);
	}

	.profile-summary p {
		margin: 0;
		max-width: 42rem;
		font-size: var(--cw-text-sm);
		line-height: 1.65;
		color: var(--cw-text-secondary);
	}

	.profile-highlights {
		display: grid;
		gap: 0.75rem;
	}

	.highlight {
		display: grid;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-md);
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--cw-bg-muted) 65%, transparent), transparent),
			var(--cw-bg-subtle);
	}

	.highlight-label {
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--cw-text-tertiary);
	}

	.highlight strong {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.profile-form {
		display: grid;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}

	.profile-section {
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 1.15rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-md);
		background-color: var(--cw-bg-subtle);
	}

	.section-title {
		margin: 0;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.section-copy {
		margin: 0 0 0.15rem;
		font-size: var(--cw-text-sm);
		line-height: 1.6;
		color: var(--cw-text-secondary);
	}

	.profile-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	@media (max-width: 820px) {
		.profile-intro,
		.profile-grid {
			grid-template-columns: 1fr;
		}

		.profile-meta {
			justify-content: flex-start;
		}
	}
</style>
