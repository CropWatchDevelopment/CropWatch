<script lang="ts">
	import { CwInput } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { IPasswordValidationResult } from '$lib/utils/strongPasswordCheck';

	interface Props {
		confirmPassword: string;
		password: string;
		passwordsMatch: boolean;
		passwordValidation: IPasswordValidationResult;
	}

	let {
		confirmPassword = $bindable(''),
		password = $bindable(''),
		passwordsMatch,
		passwordValidation
	}: Props = $props();

	function normalizeInput(value: string): string {
		return value.normalize('NFKC');
	}

	function handlePasswordInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		password = normalizeInput(target.value);
		target.value = password;
	}

	function handleConfirmPasswordInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		confirmPassword = normalizeInput(target.value);
		target.value = confirmPassword;
	}
</script>

<label class="field-block">
	<span class="field-label">{m.auth_password_label_required()}</span>
	<CwInput
		value={password}
		oninput={handlePasswordInput}
		class="auth-input"
		name="password"
		type="password"
		required
		placeholder={m.auth_password_placeholder()}
		autocomplete="new-password"
	/>
</label>

{#if password.length > 0}
	<ul class="pw-checklist" aria-label={m.auth_password_requirements()}>
		<li class:met={passwordValidation.hasMinLength}>
			<span class="pw-icon">{passwordValidation.hasMinLength ? '✓' : '○'}</span>
			{m.auth_password_requirement_length()}
		</li>
		<li class:met={passwordValidation.hasLowerCase}>
			<span class="pw-icon">{passwordValidation.hasLowerCase ? '✓' : '○'}</span>
			{m.auth_password_requirement_lowercase()}
		</li>
		<li class:met={passwordValidation.hasUpperCase}>
			<span class="pw-icon">{passwordValidation.hasUpperCase ? '✓' : '○'}</span>
			{m.auth_password_requirement_uppercase()}
		</li>
		<li class:met={passwordValidation.hasNumber}>
			<span class="pw-icon">{passwordValidation.hasNumber ? '✓' : '○'}</span>
			{m.auth_password_requirement_number()}
		</li>
		<li class:met={passwordValidation.hasSymbol}>
			<span class="pw-icon">{passwordValidation.hasSymbol ? '✓' : '○'}</span>
			{m.auth_password_requirement_symbol()}
		</li>
	</ul>
{/if}

<label class="field-block">
	<span class="field-label">{m.auth_confirm_password_label_required()}</span>
	<CwInput
		value={confirmPassword}
		oninput={handleConfirmPasswordInput}
		class="auth-input"
		name="confirmPassword"
		type="password"
		required
		placeholder={m.auth_password_placeholder()}
		autocomplete="new-password"
	/>
</label>

{#if confirmPassword.length > 0}
	<p class="pw-match-hint" class:pw-match-ok={passwordsMatch} class:pw-match-fail={!passwordsMatch}>
		{passwordsMatch ? m.auth_passwords_match() : m.auth_passwords_do_not_match()}
	</p>
{/if}

<style>
	.pw-checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.25rem;
		font-size: 0.84rem;
		color: rgb(170 185 210);
	}

	.pw-checklist li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: color 0.15s;
	}

	.pw-checklist li.met {
		color: rgb(72 220 170);
	}

	.pw-icon {
		display: inline-flex;
		width: 1rem;
		justify-content: center;
		font-weight: 600;
	}

	.pw-match-hint {
		margin: 0;
		font-size: 0.84rem;
		transition: color 0.15s;
	}

	.pw-match-ok {
		color: rgb(72 220 170);
	}

	.pw-match-fail {
		color: rgb(255 140 140);
	}
</style>
