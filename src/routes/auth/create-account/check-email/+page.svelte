<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import '../../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import KEY_ICON from '$lib/images/icons/key.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { readRedirectPath } from '$lib/utils/auth-redirect';
	import { CwCard } from '@cropwatchdevelopment/cwui';
	import YOU_ICON from '$lib/images/icons/you.svg';
	import FORWARD_ICON from '$lib/images/icons/forward.svg';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import EMAIL_ICON from '$lib/images/icons/email.svg';
	import SPAM_ICON from '$lib/images/icons/spam.svg';
	import { m } from '$lib/paraglide/messages.js';

	let redirectPath = $derived(readRedirectPath(page.url.searchParams, ''));
</script>

<svelte:head>
	<title>{m.auth_check_email_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
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

		<h1 class="check-title">{m.auth_check_email_heading()}</h1>

		<div class="check-message-box">
			<p class="check-message">
				<strong>{m.auth_check_email_account_created()}</strong>
			</p>
			<p class="check-message">
				{m.auth_check_email_activation_link_prefix()}
				<strong>{m.auth_check_email_activation_link_highlight()}</strong>
				{m.auth_check_email_activation_link_suffix()}
			</p>
			<p class="check-message check-message--action">
				{m.auth_check_email_open_inbox_prefix()}
				<strong>{m.auth_check_email_open_inbox_highlight()}</strong>
				{m.auth_check_email_open_inbox_suffix()}
			</p>
		</div>

		<div class="check-tips">
			<p class="tip-heading">{m.auth_check_email_missing_heading()}</p>
			<ul class="tip-list">
				<li>{m.auth_check_email_tip_spam()}</li>
				<li>{m.auth_check_email_tip_address()}</li>
				<li>{m.auth_check_email_tip_delivery()}</li>
			</ul>
			<div class="flex flex-row">
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={YOU_ICON} alt={m.auth_check_email_you()} class="mx-auto" />
					<span class="text-lg text-gray-400">{m.auth_check_email_you()}</span>
				</div>
				<Icon src={FORWARD_ICON} alt={m.auth_check_email_next()} class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={EYE_ICON} alt={m.auth_check_email_check()} class="mx-auto" />
					<span class="text-lg text-gray-400">{m.auth_check_email_check()}</span>
				</div>
				<Icon src={FORWARD_ICON} alt={m.auth_check_email_next()} class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={EMAIL_ICON} alt={m.auth_check_email_email()} class="mx-auto" />
					<span class="text-lg text-gray-400">{m.auth_check_email_email()}</span>
				</div>
			</div>
			<p class="my-3 w-full text-center font-bold">{m.auth_check_email_cant_find_it()}</p>
			<div class="flex flex-row">
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={YOU_ICON} alt={m.auth_check_email_you()} class="mx-auto" />
					<span class="text-lg text-gray-400">{m.auth_check_email_you()}</span>
				</div>
				<Icon src={FORWARD_ICON} alt={m.auth_check_email_next()} class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={EYE_ICON} alt={m.auth_check_email_check()} class="mx-auto" />
					<span class="text-lg text-gray-400">{m.auth_check_email_check()}</span>
				</div>
				<Icon src={FORWARD_ICON} alt={m.auth_check_email_next()} class="mx-4 my-2" />
				<div class="mt-2 w-full flex-col text-center">
					<Icon src={SPAM_ICON} alt={m.auth_check_email_spam()} class="mx-auto" preserveColor />
					<span class="text-lg text-gray-400">{m.auth_check_email_spam()}</span>
				</div>
			</div>
			<p class="my-3 w-full text-center font-bold">{m.auth_check_email_not_there()}</p>
			<a href="mailto:sayaka@cropwatch.io" rel="external" class="w-full text-center text-sm"
				>{m.auth_check_email_contact_support()}</a
			>
		</div>

		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a
			class="auth-button-link auth-button-link--primary"
			href={redirectPath
				? `${resolve('/auth/login')}?redirect=${encodeURIComponent(redirectPath)}`
				: resolve('/auth/login')}
		>
			<Icon src={KEY_ICON} alt={m.auth_sign_in()} class="h-4 w-4" />
			{m.auth_go_to_sign_in()}
		</a>

		<p class="security-copy">{m.auth_security_copy()}</p>
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
