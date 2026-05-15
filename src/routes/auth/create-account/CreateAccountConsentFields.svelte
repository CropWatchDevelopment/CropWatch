<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		agreedCookies: boolean;
		agreedPrivacy: boolean;
		agreedTerms: boolean;
		allConsentsGiven: boolean;
	}

	let {
		agreedCookies = $bindable(false),
		agreedPrivacy = $bindable(false),
		agreedTerms = $bindable(false),
		allConsentsGiven
	}: Props = $props();
</script>

<fieldset class="consent-group">
	<legend class="field-label">{m.auth_required_agreements_label()}</legend>

	<label class="consent-item">
		<input type="checkbox" bind:checked={agreedTerms} class="consent-checkbox" />
		<span>
			{m.auth_agree_to()}
			<a
				href="https://app.cropwatch.io/legal/EULA"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link">{m.auth_terms_of_service()}</a
			>
		</span>
	</label>

	<label class="consent-item">
		<input type="checkbox" bind:checked={agreedPrivacy} class="consent-checkbox" />
		<span>
			{m.auth_agree_to()}
			<a
				href="https://app.cropwatch.io/legal/privacy-policy"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link">{m.auth_privacy_policy()}</a
			>
		</span>
	</label>

	<label class="consent-item">
		<input type="checkbox" bind:checked={agreedCookies} class="consent-checkbox" />
		<span>
			{m.auth_agree_to()}
			<a
				href="https://app.cropwatch.io/legal/cookie-policy"
				target="_blank"
				rel="noopener noreferrer"
				class="auth-link">{m.auth_cookie_policy()}</a
			>
		</span>
	</label>

	{#if !allConsentsGiven && (agreedTerms || agreedPrivacy || agreedCookies)}
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

	.consent-hint {
		margin: 0;
		font-size: 0.82rem;
		color: rgb(255 200 120);
	}
</style>
