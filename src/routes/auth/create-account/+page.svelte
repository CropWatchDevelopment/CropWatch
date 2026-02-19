<script lang="ts">
	import logo from '$lib/images/cropwatch_static.svg';
	import ADD_PERSON_ICON from '$lib/images/icons/person_add.svg';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import FORGOT_SHIELD_ICON from '$lib/images/icons/forgot_shield.svg';
	import { goto } from '$app/navigation';
	import { CwButton, CwCard, CwInput } from '@cropwatchdevelopment/cwui';
</script>

<svelte:head>
	<title>Create Account - CropWatch Temp</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt="CropWatch" class="logo-image" />
		</div>

		<h1 class="auth-title">Create your account</h1>
		<p class="auth-subtitle">Set up your CropWatch account to start monitoring your locations.</p>

		<form method="POST" action="?/create-account" class="auth-form">
			<label class="field-block">
				<span class="field-label">FULL NAME</span>
				<CwInput
					class="auth-input"
					name="fullName"
					type="text"
					required
					placeholder="Jane Doe"
					autocomplete="name"
				/>
			</label>

			<label class="field-block">
				<span class="field-label">EMAIL</span>
				<CwInput
					class="auth-input"
					name="email"
					type="email"
					required
					placeholder="you@example.com"
					autocomplete="email"
				/>
			</label>

			<label class="field-block">
				<span class="field-label">PASSWORD</span>
				<CwInput
					class="auth-input"
					name="password"
					type="password"
					required
					placeholder="••••••••"
					autocomplete="new-password"
				/>
			</label>

			<label class="field-block">
				<span class="field-label">CONFIRM PASSWORD</span>
				<CwInput
					class="auth-input"
					name="confirmPassword"
					type="password"
					required
					placeholder="••••••••"
					autocomplete="new-password"
				/>
			</label>

			<CwButton class="auth-primary" type="submit" variant="primary" size="md" fullWidth={true}>
				<img src={ADD_PERSON_ICON} alt="Create account icon" class="h-4 w-4" />
				Create Account
			</CwButton>

			<div class="action-grid">
				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto('/auth/login')}
				>
					<img src={BACK_ICON} alt="Back to login icon" class="h-4 w-4" />
					Back to Login
				</CwButton>

				<CwButton
					class="auth-secondary"
					type="button"
					variant="secondary"
					size="md"
					fullWidth={true}
					onclick={() => goto('/auth/forgot-password')}
				>
					<img src={FORGOT_SHIELD_ICON} alt="Forgot password icon" class="h-4 w-4" />
					Forgot Password
				</CwButton>
			</div>
		</form>

		<p class="security-copy">Protected by reCAPTCHA and CropWatch Security</p>
	</div>
</CwCard>

<style>
	:global(.auth-card.cw-card) {
		width: 100%;
		border-radius: 1rem;
		border-color: rgb(65 91 136 / 60%);
		background: linear-gradient(180deg, rgb(11 27 62 / 95%) 0%, rgb(11 25 58 / 93%) 100%);
		box-shadow: 0 34px 90px rgb(2 8 24 / 70%);
		overflow: hidden;
	}

	:global(.auth-card .cw-card__body) {
		padding: 0;
	}

	.auth-shell {
		padding: 1.8rem 1.4rem 1rem;
	}

	.logo-frame {
		display: grid;
		height: 3.95rem;
		width: 3.95rem;
		place-items: center;
		margin: 0 auto 1.35rem;
		border-radius: 0.9rem;
		border: 1px solid rgb(61 88 130 / 56%);
		background: linear-gradient(180deg, rgb(19 42 85 / 90%), rgb(15 33 71 / 88%));
		box-shadow: inset 0 1px 0 rgb(128 163 214 / 15%);
	}

	.logo-image {
		height: 2rem;
		width: 2rem;
	}

	.auth-title {
		margin: 0;
		text-align: center;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: rgb(239 245 255);
	}

	.auth-subtitle {
		margin: 0.45rem 0 1.3rem;
		text-align: center;
		font-size: 1rem;
		color: rgb(158 176 205);
	}

	.auth-form {
		display: grid;
		gap: 0.82rem;
	}

	.field-block {
		display: grid;
		gap: 0.42rem;
	}

	.field-label {
		font-size: 0.84rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		color: rgb(151 171 201);
	}

	:global(.auth-input .cw-input__field) {
		min-height: 3rem;
		border-color: rgb(58 84 126 / 80%);
		border-radius: 0.8rem;
		background: rgb(23 41 79 / 78%);
		padding: 0.78rem 0.9rem;
		font-size: 1.06rem;
		color: rgb(223 236 255);
	}

	:global(.auth-input .cw-input__field::placeholder) {
		color: rgb(140 162 196);
	}

	:global(.auth-input .cw-input__field:focus) {
		border-color: rgb(86 140 214 / 90%);
		box-shadow: 0 0 0 2px rgb(70 137 220 / 26%);
	}

	:global(.auth-primary.cw-button) {
		min-height: 3rem;
		border-radius: 0.8rem;
		border-color: rgb(83 149 213 / 70%);
		background: linear-gradient(180deg, #3889cb 0%, #2f74b3 100%);
		color: rgb(242 248 255);
		font-size: 1.12rem;
		font-weight: 500;
	}

	:global(.auth-primary.cw-button:hover:not(:disabled)) {
		border-color: rgb(108 167 228 / 76%);
		background: linear-gradient(180deg, #4395d8 0%, #347fbe 100%);
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	:global(.auth-secondary.cw-button) {
		min-height: 2.48rem;
		border-radius: 0.75rem;
		border-color: rgb(72 96 136 / 80%);
		background: rgb(33 53 90 / 84%);
		color: rgb(218 229 245);
		font-size: 1rem;
		font-weight: 450;
	}

	:global(.auth-secondary.cw-button:hover:not(:disabled)) {
		border-color: rgb(95 126 174 / 85%);
		background: rgb(39 62 102 / 88%);
	}

	.security-copy {
		margin: 1.25rem 0 0;
		text-align: center;
		font-size: 0.84rem;
		color: rgb(135 155 187);
	}

	@media (max-width: 420px) {
		.auth-shell {
			padding: 1.45rem 1rem 0.85rem;
		}

		.action-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
