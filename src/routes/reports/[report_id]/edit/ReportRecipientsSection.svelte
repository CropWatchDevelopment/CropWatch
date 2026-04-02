<script lang="ts">
	import { AppFormStack, AppNotice } from '$lib/components/layout';
	import Icon from '$lib/components/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import type { RecipientDraft, SelectOption } from './report-form.types';

	interface Props {
		recipients?: RecipientDraft[];
		communicationMethodOptions: SelectOption[];
		onAdd: () => void;
		onRemove: (key: string) => void;
	}

	let {
		recipients = $bindable<RecipientDraft[]>([]),
		communicationMethodOptions,
		onAdd,
		onRemove
	}: Props = $props();
</script>

<CwCard
	title={m.reports_create_recipients_title()}
	subtitle={m.reports_create_recipients_subtitle()}
	elevated
>
	<AppFormStack padded>
		<div class="report-section-toolbar">
			<p class="report-section-copy">{m.reports_create_recipients_copy()}</p>
			<CwButton type="button" variant="secondary" onclick={onAdd}>
				<Icon src={ADD_ICON} class="h-4 w-4" />
			</CwButton>
		</div>

		{#if recipients.length === 0}
			<AppNotice tone="neutral">
				<p>{m.reports_create_empty_recipients()}</p>
			</AppNotice>
		{/if}

		{#each recipients as recipient, index (recipient.key)}
			<div class="report-entry-card">
				<div class="report-entry-card__header report-entry-card__header--spread">
					<div>
						<h3>{m.reports_create_recipient_heading({ index: String(index + 1) })}</h3>
						<p>{m.reports_create_recipient_copy()}</p>
					</div>
					{#if recipients.length > 1}
						<CwButton
							type="button"
							variant="danger"
							size="sm"
							onclick={() => onRemove(recipient.key)}
						>
							{m.action_remove()}
						</CwButton>
					{/if}
				</div>

				<div class="report-field-grid report-field-grid--three">
					<CwDropdown
						label={m.reports_create_communication_method()}
						options={communicationMethodOptions}
						bind:value={recipient.communication_method}
					/>
					<CwInput
						label={m.reports_create_email_label()}
						type="email"
						placeholder={m.reports_create_email_placeholder()}
						bind:value={recipient.email}
					/>
					<CwInput
						label={m.common_name()}
						placeholder={m.reports_create_recipient_name_placeholder()}
						bind:value={recipient.name}
					/>
				</div>
			</div>
		{/each}
	</AppFormStack>
</CwCard>

<style>
	.report-section-toolbar,
	.report-entry-card__header--spread {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cw-space-3);
	}

	.report-section-copy {
		margin: 0;
		max-width: 48rem;
		color: var(--cw-text-secondary);
	}

	.report-entry-card {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.report-entry-card__header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: var(--cw-font-semibold);
	}

	.report-entry-card__header p {
		margin: var(--cw-space-1) 0 0;
		color: var(--cw-text-secondary);
	}

	.report-field-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--cw-space-3);
	}

	@media (max-width: 767px) {
		.report-field-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 639px) {
		.report-section-toolbar,
		.report-entry-card__header--spread {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
