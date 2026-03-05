<script lang="ts">
	import '../../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import YOU_ICON from '$lib/images/icons/you.svg';
	import FORWARD_ICON from '$lib/images/icons/forward.svg';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import EMAIL_ICON from '$lib/images/icons/email.svg';
	import SPAM_ICON from '$lib/images/icons/spam.svg';
</script>

<svelte:head>
	<title>Check Your Email - CropWatch</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt="CropWatch" class="logo-image" />
		</div>

		<!-- Big email icon -->
		<div class="email-icon-frame" aria-hidden="true">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="email-icon"
			>
				<rect x="2" y="4" width="20" height="16" rx="2" />
				<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
			</svg>
		</div>

		<h1 class="check-title">Check Your Email</h1>

		<div class="check-message-box">
			<p class="check-message">
				<strong>Your account has been created!</strong>
			</p>
			<p class="check-message">
				We've sent an <strong>activation link</strong> to the email address you provided.
			</p>
			<p class="check-message check-message--action">
				Open your inbox, find the email from CropWatch, and <strong>click the link inside</strong> to
				activate your account.
			</p>
		</div>

		<div class="check-tips">
			<p class="tip-heading">Don't see the email?</p>
			<ul class="tip-list">
				<li>Check your <strong>spam</strong> or <strong>junk</strong> folder</li>
				<li>Make sure you entered the correct email address</li>
				<li>Allow a few minutes for delivery</li>
			</ul>
			<div class="flex flex-row">
				<div class="mt-2 w-full flex-col text-center">
					<img src={YOU_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">YOU</span>
				</div>
				<img src={FORWARD_ICON} alt="Forward icon" class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<img src={EYE_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">CHECK</span>
				</div>
				<img src={FORWARD_ICON} alt="Forward icon" class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<img src={EMAIL_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">EMAIL</span>
				</div>
			</div>
			<p class="my-3 w-full text-center font-bold">Can't find it???</p>
			<div class="flex flex-row">
				<div class="mt-2 w-full flex-col text-center">
					<img src={YOU_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">YOU</span>
				</div>
				<img src={FORWARD_ICON} alt="Forward icon" class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<img src={EYE_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">CHECK</span>
				</div>
				<img src={FORWARD_ICON} alt="Forward icon" class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<img src={SPAM_ICON} alt="You icon" class="mx-auto" />
					<span class="text-lg text-gray-400">SPAM</span>
				</div>
			</div>
			<p class="my-3 w-full text-center font-bold">Not there???</p>
			<a href="mailto:sayaka@cropwatch.io" class="text-center w-full text-sm">Please contact support</a>
		</div>

		<CwButton
			class="auth-primary"
			type="button"
			variant="primary"
			size="md"
			fullWidth={true}
			onclick={() => goto(resolve('/auth/login'))}
		>
			<img src={KEY_ICON} alt="Sign in icon" class="h-4 w-4" />
			Go to Sign In
		</CwButton>

		<p class="security-copy">Protected by reCAPTCHA and CropWatch Security</p>
	</div>
</CwCard>

<style>
	/* ── Large email icon ──────────────────────────────────── */
	.email-icon-frame {
		display: grid;
		place-items: center;
		margin: 0.6rem auto 1rem;
		height: 5rem;
		width: 5rem;
		border-radius: 50%;
		background: linear-gradient(180deg, rgb(34 72 128 / 80%), rgb(24 52 100 / 75%));
		border: 1px solid rgb(72 110 170 / 50%);
		box-shadow: 0 0 30px rgb(56 140 220 / 20%);
	}

	.email-icon {
		height: 2.6rem;
		width: 2.6rem;
		color: rgb(120 200 255);
	}

	/* ── Title ─────────────────────────────────────────────── */
	.check-title {
		margin: 0 0 1rem;
		text-align: center;
		font-size: 1.6rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: rgb(239 245 255);
	}

	/* ── Main message box ──────────────────────────────────── */
	.check-message-box {
		border: 1px solid rgb(72 180 120 / 40%);
		border-radius: 0.85rem;
		background: rgb(72 180 120 / 10%);
		padding: 1rem 1.1rem;
		margin-bottom: 1rem;
	}

	.check-message {
		margin: 0 0 0.6rem;
		font-size: 1rem;
		line-height: 1.55;
		color: rgb(210 230 220);
		text-align: center;
	}

	.check-message:last-child {
		margin-bottom: 0;
	}

	.check-message--action {
		font-size: 1.06rem;
		color: rgb(120 240 180);
	}

	/* ── Tips section ──────────────────────────────────────── */
	.check-tips {
		border: 1px solid rgb(58 84 126 / 50%);
		border-radius: 0.8rem;
		padding: 0.85rem 1rem;
		margin-bottom: 1.2rem;
		background: rgb(23 41 79 / 50%);
	}

	.tip-heading {
		margin: 0 0 0.45rem;
		font-size: 0.92rem;
		font-weight: 600;
		color: rgb(190 205 228);
	}

	.tip-list {
		margin: 0;
		padding-left: 1.3rem;
		display: grid;
		gap: 0.3rem;
		font-size: 0.88rem;
		color: rgb(160 178 206);
	}
</style>
