<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

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

	const statusCode = $derived(page.error ? (page.status ?? 500) : 500);
	const knownError = $derived(errorMessages[statusCode]);
	const title = $derived(knownError?.title ?? m.error_unexpected_title());
	const description = $derived(page.error?.message ?? knownError?.description ?? m.error_unknown());

	function resetAndLogin() {
		if (!browser) return;
		try { localStorage.clear(); } catch { /* ignore */ }
		try { sessionStorage.clear(); } catch { /* ignore */ }
		try {
			document.cookie.split(';').forEach((c) => {
				const name = c.split('=')[0].trim();
				if (name) {
					document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
				}
			});
		} catch { /* ignore */ }
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
			<CwButton variant="primary" onclick={() => goto('/')}>{m.action_go_home()}</CwButton>
			<CwButton variant="ghost" onclick={() => history.back()}>{m.action_go_back()}</CwButton>
			<CwButton variant="danger" onclick={resetAndLogin}>{m.error_reset_and_login()}</CwButton>
		</div>
	</CwCard>
</div>
