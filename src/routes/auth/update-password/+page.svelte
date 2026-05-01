<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import { resolve } from '$app/paths';
	import { applyAction, enhance } from '$app/forms';
	import { isStrongPassword } from '$lib/utils/strongPasswordCheck';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import '../login/style.css';

	interface Props {
		form: { message?: string } | null;
	}

	const toast = useCwToast();

	let { form }: Props = $props();

	let submitting: boolean = $state(false);
	let password: string = $state('');
	let confirmPassword: string = $state('');

	let strength = $derived(isStrongPassword(password));
	let passwordsMatch = $derived(confirmPassword.length > 0 && password === confirmPassword);
	let passwordsMismatch = $derived(confirmPassword.length > 0 && password !== confirmPassword);
</script>

<svelte:head>
	<title>{m.auth_update_password_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.auth_update_password_heading()}</h1>
		<p class="auth-subtitle">{m.auth_update_password_subtitle()}</p>

		<form
			method="POST"
			class="auth-form"
			use:enhance={() => {
				if (submitting) return;
				submitting = true;

				return async ({ result }) => {
					if (result.type === 'failure' && typeof result.data?.message === 'string') {
						toast.add({ message: result.data.message, tone: 'danger' });
					}
					submitting = false;
					await applyAction(result);
				};
			}}
		>
			<label class="field-block">
				<span class="field-label">{m.auth_password_label()}</span>
				<CwInput
					class="auth-input"
					name="password"
					type="password"
					placeholder={m.auth_password_placeholder()}
					autocomplete="new-password"
					required
					bind:value={password}
				/>
			</label>

			{#if password.length > 0}
				<div class="password-requirements">
					<p class="req-heading">{m.auth_password_requirements()}</p>
					<ul class="req-list">
						<li class:met={strength.hasMinLength}>{m.auth_password_requirement_length()}</li>
						<li class:met={strength.hasLowerCase}>{m.auth_password_requirement_lowercase()}</li>
						<li class:met={strength.hasUpperCase}>{m.auth_password_requirement_uppercase()}</li>
						<li class:met={strength.hasNumber}>{m.auth_password_requirement_number()}</li>
						<li class:met={strength.hasSymbol}>{m.auth_password_requirement_symbol()}</li>
					</ul>
				</div>
			{/if}

			<label class="field-block">
				<span class="field-label">{m.auth_update_password_confirm_label()}</span>
				<CwInput
					class="auth-input"
					name="confirmPassword"
					type="password"
					placeholder={m.auth_password_placeholder()}
					autocomplete="new-password"
					required
					bind:value={confirmPassword}
				/>
			</label>

			{#if passwordsMatch}
				<p class="match-ok">{m.auth_passwords_match()}</p>
			{:else if passwordsMismatch}
				<p class="match-err">{m.auth_passwords_do_not_match()}</p>
			{/if}

			<CwButton
				type="submit"
				class="auth-primary"
				fullWidth
				disabled={submitting || !strength.isValid || !passwordsMatch}
			>
				<Icon src={KEY_ICON} alt="" class="h-4 w-4" />
				{submitting ? m.auth_sending() : m.auth_update_password_submit()}
			</CwButton>
		</form>

		<a class="auth-link" href={resolve('/auth/login')}>
			<Icon src={BACK_ICON} alt="" class="h-4 w-4" />
			{m.auth_back_to_login()}
		</a>
	</div>
</CwCard>

<style>
	.password-requirements {
		font-size: 0.82rem;
		color: rgb(158 176 205);
	}

	.req-heading {
		margin: 0 0 0.3rem;
		font-weight: 600;
	}

	.req-list {
		margin: 0;
		padding-left: 1.2rem;
		list-style: disc;
	}

	.req-list li {
		color: rgb(220 120 120);
	}

	.req-list li.met {
		color: rgb(100 200 130);
	}

	.match-ok {
		margin: 0;
		font-size: 0.85rem;
		color: rgb(100 200 130);
	}

	.match-err {
		margin: 0;
		font-size: 0.85rem;
		color: rgb(220 120 120);
	}

	.auth-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 1.2rem;
		font-size: 0.9rem;
		color: rgb(140 175 220);
		text-decoration: none;
	}

	.auth-link:hover {
		color: rgb(180 210 255);
	}
</style>
