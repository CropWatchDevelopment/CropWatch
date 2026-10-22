<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { clearAllClientState } from '$lib/utils/client-state';

	const errorMessages: Record<number, { title: string; description: string }> = {
		400: {
			title: m.error_bad_request_title(),
			description: m.error_bad_request_description()
		},
		401: {
			title: m.error_unauthorized_title(),
			description: m.error_unauthorized_description()
		},
		403: {
			title: m.error_forbidden_title(),
			description: m.error_forbidden_description()
		},
		404: {
			title: m.error_not_found_title(),
			description: m.error_not_found_description()
		},
		408: {
			title: m.error_timeout_title(),
			description: m.error_timeout_description()
		},
		429: {
			title: m.error_too_many_requests_title(),
			description: m.error_too_many_requests_description()
		},
		500: {
			title: m.error_internal_server_title(),
			description: m.error_internal_server_description()
		},
		502: {
			title: m.error_bad_gateway_title(),
			description: m.error_bad_gateway_description()
		},
		503: {
			title: m.error_service_unavailable_title(),
			description: m.error_service_unavailable_description()
		},
		504: {
			title: m.error_gateway_timeout_title(),
			description: m.error_gateway_timeout_description()
		}
	};

	/**
	 * The English placeholders `page.error.message` holds when nothing more is
	 * known: SvelteKit's and the handleError hooks' "Not Found" / "Internal
	 * Error", SvelteKit's "Error: 404" for an error without a message, and the
	 * capability gate's "Forbidden". The page explains the status in the user's
	 * language instead; a message the app gave the error itself is shown.
	 */
	const GENERIC_MESSAGE = /^(?:Not Found|Internal Error|Forbidden|Error: \d{3})$/;

	const statusCode = $derived(page.error ? (page.status ?? 500) : 500);
	const knownError = $derived(errorMessages[statusCode]);
	const title = $derived(knownError?.title ?? m.error_unexpected_title());
	const ownMessage = $derived(
		page.error?.message && !GENERIC_MESSAGE.test(page.error.message) ? page.error.message : null
	);
	const description = $derived(ownMessage ?? knownError?.description ?? m.error_unknown());

	function resetAndLogin() {
		if (!browser) return;
		clearAllClientState();
		window.location.href = '/auth/login?reason=error-recovery';
	}
</script>

<div class="flex flex-1 items-center justify-center p-4">
	<CwCard class="w-full max-w-lg" padded>
		{#snippet header()}
			<div class="flex flex-col items-center gap-2 pt-4">
				<div class="flex-row text-5xl">
					{#if statusCode == 500}
						💣
					{:else if statusCode == 404}
						🔍
					{:else if statusCode == 401}
						🔒
					{:else}
						⚠️
					{/if}
					<span class="text-6xl font-bold opacity-20">{statusCode}</span>
				</div>
				<h1 class="text-2xl font-semibold">{title}</h1>
			</div>
		{/snippet}

		<p class="text-center text-sm opacity-70">{description}</p>

		<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
			<CwButton id="error-home-button" variant="primary" onclick={() => goto(resolve('/'))}
				>{m.action_go_home()}</CwButton
			>
			<CwButton id="error-back-button" variant="ghost" onclick={() => history.back()}
				>{m.action_go_back()}</CwButton
			>
			<CwButton id="error-reset-login-button" variant="danger" onclick={resetAndLogin}
				>{m.error_reset_and_login()}</CwButton
			>
		</div>
	</CwCard>
</div>
