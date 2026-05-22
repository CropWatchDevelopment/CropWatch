<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		agreedPrivacy: boolean;
		agreedTerms: boolean;
		agreedEula: boolean;
		allConsentsGiven: boolean;
	}

	let {
		agreedPrivacy = $bindable(false),
		agreedTerms = $bindable(false),
		agreedEula = $bindable(false),
		allConsentsGiven
	}: Props = $props();

	// The matching checkbox stays disabled until its policy link has been opened.
	let visitedPrivacy = $state(false);
	let visitedTerms = $state(false);
	let visitedEula = $state(false);
</script>

<fieldset class="consent-group">
	<legend class="field-label">{m.auth_required_agreements_label()}</legend>

	<p class="consent-note">{m.auth_open_link_first()}</p>

	<label class="consent-item">
		<input
			type="checkbox"
			bind:checked={agreedPrivacy}
			disabled={!visitedPrivacy}
			class="consent-checkbox"
		/>
		<span>
			{m.auth_agree_to()}
			<a
				href="https://www.cropwatch.io/legal/privacy-policy"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link"
				onclick={() => (visitedPrivacy = true)}>{m.auth_privacy_policy()}</a
			>
		</span>
	</label>

	<label class="consent-item">
		<input
			type="checkbox"
			bind:checked={agreedTerms}
			disabled={!visitedTerms}
			class="consent-checkbox"
		/>
		<span>
			{m.auth_agree_to()}
			<a
				href="https://www.cropwatch.io/legal/terms-of-service"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link"
				onclick={() => (visitedTerms = true)}>{m.auth_cookie_policy()}</a
			>
		</span>
	</label>

	<label class="consent-item">
		<input type="checkbox" bind:checked={agreedEula} disabled={!visitedEula} class="consent-checkbox" />
		<span>
			{m.auth_agree_to()}
			<a
				href="https://www.cropwatch.io/legal/EULA"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link"
				onclick={() => (visitedEula = true)}>{m.auth_eula()}</a
			>
		</span>
	</label>

	{#if !allConsentsGiven && (agreedPrivacy || agreedTerms || agreedEula)}
		<p class="consent-hint">{m.auth_all_three_required()}</p>
	{/if}
</fieldset>

<style>
	.consent-group {
		border: 1px solid rgb(58 84 126 / 60%);
		border-radius: 0.8rem;
		padding: 0.9rem 1rem;
		margin: 0;
		display: grid;
		gap: 0.6rem;
	}

	.consent-group legend {
		padding: 0 0.4rem;
	}

	.consent-note {
		margin: 0;
		font-size: 0.82rem;
		color: rgb(160 180 205);
	}

	.consent-item {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		font-size: 0.92rem;
		color: rgb(200 215 235);
		cursor: pointer;
	}

	.consent-checkbox {
		margin-top: 0.18rem;
		width: 1.1rem;
		height: 1.1rem;
		accent-color: rgb(56 137 203);
		cursor: pointer;
		flex-shrink: 0;
	}

	.consent-checkbox:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.consent-hint {
		margin: 0;
		font-size: 0.82rem;
		color: rgb(255 200 120);
	}
</style>
