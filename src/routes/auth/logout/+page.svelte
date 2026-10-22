<script lang="ts">
	import '../login/style.css';
	import logo from '$lib/images/cropwatch_static.svg';
	import { resolve } from '$app/paths';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.auth_sign_out_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.auth_sign_out_title()}</h1>
		<p class="auth-subtitle">{m.auth_sign_out_description()}</p>

		<!-- No `action`: posts to this URL, keeping its ?redirect= target. -->
		<form id="logout-form" method="POST" class="auth-form">
			<CwButton
				id="logout-submit-button"
				class="auth-primary"
				type="submit"
				variant="primary"
				size="md"
				fullWidth={true}
			>
				{m.nav_logout()}
			</CwButton>
			<a
				id="logout-cancel-link"
				class="auth-button-link auth-button-link--secondary"
				href={resolve('/')}
			>
				{m.action_cancel()}
			</a>
		</form>
	</div>
</CwCard>
