<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';

	const errorMessages: Record<number, { title: string; description: string }> = {
		400: {
			title: 'Bad Request',
			description: 'The server could not understand your request. Please check the URL and try again.'
		},
		401: {
			title: 'Unauthorized',
			description: 'You need to be logged in to access this page.'
		},
		403: {
			title: 'Forbidden',
			description: 'You do not have permission to access this resource.'
		},
		404: {
			title: 'Page Not Found',
			description: 'The page you are looking for does not exist or has been moved.'
		},
		408: {
			title: 'Request Timeout',
			description: 'The server timed out waiting for your request. Please try again.'
		},
		429: {
			title: 'Too Many Requests',
			description: 'You have made too many requests. Please wait a moment and try again.'
		},
		500: {
			title: 'Internal Server Error',
			description: 'Something went wrong on our end. Please try again later.'
		},
		502: {
			title: 'Bad Gateway',
			description: 'The server received an invalid response. Please try again later.'
		},
		503: {
			title: 'Service Unavailable',
			description: 'The service is temporarily unavailable. Please try again later.'
		},
		504: {
			title: 'Gateway Timeout',
			description: 'The server took too long to respond. Please try again later.'
		}
	};

	const statusCode = $derived(page.error ? (page.status ?? 500) : 500);
	const knownError = $derived(errorMessages[statusCode]);
	const title = $derived(knownError?.title ?? 'Unexpected Error');
	const description = $derived(
		page.error?.message ?? knownError?.description ?? 'An unknown error occurred.'
	);
</script>

<div class="flex flex-1 items-center justify-center p-4">
	<CwCard class="w-full max-w-lg" padded>
		{#snippet header()}
			<div class="flex flex-col items-center gap-2 pt-4">
				<span class="text-6xl font-bold opacity-20">{statusCode}</span>
				<h1 class="text-2xl font-semibold">{title}</h1>
			</div>
		{/snippet}

		<p class="text-center text-sm opacity-70">{description}</p>

		<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
			<CwButton variant="primary" onclick={() => goto('/')}>
				Go Home
			</CwButton>
			<CwButton variant="ghost" onclick={() => history.back()}>
				Go Back
			</CwButton>
		</div>
	</CwCard>
</div>