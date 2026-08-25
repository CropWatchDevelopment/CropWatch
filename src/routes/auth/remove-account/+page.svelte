<script lang="ts">
	import { onMount } from 'svelte';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import type { AccountRemovalChallengeDto } from '$lib/api/api.dtos';
	import { CwButton, CwCard, CwInput, CwTextArea } from '@cropwatchdevelopment/cwui';

	// Deliberately public and client-driven: anonymous API calls are rate-limited
	// per client IP, which only works when the browser talks to the API directly
	// (SSR would pool every visitor behind Vercel's shared egress IPs).
	let challenge = $state<AccountRemovalChallengeDto | null>(null);
	let challengeFailed = $state(false);
	let email = $state('');
	let message = $state('');
	let answer = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let errorMessage = $state<string | null>(null);

	async function loadChallenge(): Promise<void> {
		challengeFailed = false;
		try {
			challenge = await new ApiService({}).getAccountRemovalChallenge();
		} catch {
			// The human check is mandatory: without a server challenge the form is
			// not rendered at all (see template) — never a submit path around it.
			challenge = null;
			challengeFailed = true;
		}
	}

	onMount(() => {
		void loadChallenge();
	});

	const canSubmit = $derived(
		!submitting &&
			challenge !== null &&
			email.trim().length > 3 &&
			email.includes('@') &&
			answer.trim().length > 0
	);

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!challenge || submitting) return;

		submitting = true;
		errorMessage = null;
		try {
			await new ApiService({}).requestAccountRemoval({
				email: email.trim(),
				message: message.trim() || undefined,
				answer: Number.parseInt(answer.trim(), 10),
				token: challenge.token
			});
			submitted = true;
		} catch (error) {
			if (error instanceof ApiServiceError && error.status === 400) {
				errorMessage = m.account_removal_error_answer();
			} else if (error instanceof ApiServiceError && error.status === 429) {
				errorMessage = m.account_removal_error_rate_limited();
			} else {
				errorMessage = m.account_removal_error_generic();
			}
			answer = '';
			await loadChallenge();
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{m.account_removal_title()} - CropWatch</title>
</svelte:head>

<AppPage width="md">
	<CwCard title={m.account_removal_title()} subtitle={m.account_removal_subtitle()} elevated>
		<AppFormStack padded>
			{#if submitted}
				<AppNotice tone="success" ariaLive="polite">
					<p>{m.account_removal_success()}</p>
				</AppNotice>
			{:else if challengeFailed}
				<AppNotice tone="danger" ariaLive="polite">
					<p>{m.account_removal_error_generic()}</p>
				</AppNotice>
				<AppActionRow>
					<CwButton variant="secondary" onclick={() => void loadChallenge()}>
						{m.account_removal_retry()}
					</CwButton>
				</AppActionRow>
			{:else if challenge}
				<p>{m.account_removal_intro()}</p>

				{#if errorMessage}
					<AppNotice tone="danger" ariaLive="polite">
						<p>{errorMessage}</p>
					</AppNotice>
				{/if}

				<form onsubmit={submit}>
					<AppFormStack>
						<CwInput
							label={m.account_removal_email_label()}
							name="email"
							type="email"
							bind:value={email}
							placeholder="you@example.com"
							required
						/>
						<CwTextArea
							label={m.account_removal_message_label()}
							name="message"
							bind:value={message}
							placeholder={m.account_removal_message_placeholder()}
						/>
						<CwInput
							label={m.account_removal_challenge_label({ question: challenge.question })}
							name="answer"
							bind:value={answer}
							required
						/>
						<AppActionRow>
							<CwButton type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
								{m.account_removal_submit()}
							</CwButton>
						</AppActionRow>
					</AppFormStack>
				</form>
			{/if}
		</AppFormStack>
	</CwCard>
</AppPage>
