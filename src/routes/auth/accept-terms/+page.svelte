<script lang="ts">
	import '../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { applyAction, enhance } from '$app/forms';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { AppNotice } from '$lib/components/layout';
	import LegalConsentFields from '$lib/components/auth/LegalConsentFields.svelte';
	import { buildLogoutPath, readRedirectPath } from '$lib/utils/auth-redirect';
	import type { LegalDocumentKind } from '$lib/api/api.dtos';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let agreedPrivacy = $state(false);
	let agreedTerms = $state(false);
	let agreedEula = $state(false);

	let allConsentsGiven = $derived(agreedPrivacy && agreedTerms && agreedEula);
	let redirectPath = $derived(readRedirectPath(page.url.searchParams, '/'));
	let updatedDocuments = $derived(data.documents.filter((doc) => doc.needs_acceptance));

	const DOC_LABELS: Record<LegalDocumentKind, () => string> = {
		privacy_policy: m.legal_doc_privacy_policy,
		terms_of_service: m.legal_doc_terms_of_service,
		eula: m.legal_doc_eula
	};

	function documentUrl(kind: LegalDocumentKind): string | undefined {
		return data.documents.find((doc) => doc.kind === kind)?.url;
	}
</script>

<svelte:head>
	<title>{m.legal_reaccept_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.legal_reaccept_heading()}</h1>
		<p class="auth-subtitle">{m.legal_reaccept_description()}</p>

		<ul class="updated-docs">
			{#each updatedDocuments as doc (doc.kind)}
				<li>
					<span class="updated-doc-name">{DOC_LABELS[doc.kind]()}</span>
					<span class="updated-doc-date">
						{m.legal_reaccept_updated_on({
							date: new Date(doc.effective_at).toLocaleDateString()
						})}
					</span>
				</li>
			{/each}
		</ul>

		<form
			id="accept-terms-form"
			method="POST"
			class="auth-form"
			use:enhance={({ formData, cancel }) => {
				if (submitting) {
					cancel();
					return;
				}
				submitting = true;

				formData.set('agreedPrivacy', String(agreedPrivacy));
				formData.set('agreedTerms', String(agreedTerms));
				formData.set('agreedEula', String(agreedEula));

				return async ({ result }) => {
					try {
						if (result.type === 'success') {
							// eslint-disable-next-line svelte/no-navigation-without-resolve -- path sanitized by readRedirectPath
							await goto(redirectPath, { invalidateAll: true });
							return;
						}
						await applyAction(result);
					} finally {
						submitting = false;
					}
				};
			}}
		>
			{#if form?.error}
				<AppNotice tone="danger">
					<p>{form.error}</p>
				</AppNotice>
			{/if}

			<LegalConsentFields
				bind:agreedPrivacy
				bind:agreedTerms
				bind:agreedEula
				{allConsentsGiven}
				privacyUrl={documentUrl('privacy_policy')}
				termsUrl={documentUrl('terms_of_service')}
				eulaUrl={documentUrl('eula')}
			/>

			<CwButton
				id="accept-terms-submit-button"
				class="auth-primary"
				type="submit"
				variant="primary"
				loading={submitting}
				disabled={!allConsentsGiven || submitting}
				size="md"
				fullWidth={true}
			>
				{m.legal_reaccept_submit()}
			</CwButton>

			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				id="accept-terms-sign-out-link"
				class="auth-button-link auth-button-link--secondary"
				href={buildLogoutPath()}
			>
				{m.legal_reaccept_sign_out()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</form>
	</div>
</CwCard>

<style>
	.updated-docs {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.35rem;
	}

	.updated-docs li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.92rem;
		color: rgb(200 215 235);
	}

	.updated-doc-name {
		font-weight: 600;
	}

	.updated-doc-date {
		font-size: 0.82rem;
		color: rgb(160 180 205);
	}
</style>
