<!--
  The red "Danger zone" card at the bottom of a settings page. Presentational
  only: the owning component keeps the form, the confirmation dialog
  (DangerZoneDialog) and the submit logic. Render the delete form as children.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';

	interface Props {
		/** Element ids are `${idPrefix}-open-button`, matching DangerZoneDialog. */
		idPrefix: string;
		heading: string;
		description: string;
		buttonLabel: string;
		/** The last attempt's failure, shown as a danger notice. */
		errorMessage?: string | null;
		/** Why deleting is not possible yet; shown as a warning and disables the button. */
		blockedMessage?: string | null;
		busy?: boolean;
		onDelete: () => void;
		children?: Snippet;
	}

	let {
		idPrefix,
		heading,
		description,
		buttonLabel,
		errorMessage = null,
		blockedMessage = null,
		busy = false,
		onDelete,
		children
	}: Props = $props();
</script>

<div class="danger-zone">
	<CwCard title={m.danger_zone_title()} elevated>
		{@render children?.()}
		<AppFormStack padded>
			{#if errorMessage}
				<AppNotice tone="danger">
					<p>{errorMessage}</p>
				</AppNotice>
			{/if}
			{#if blockedMessage}
				<AppNotice tone="warning">
					<p>{blockedMessage}</p>
				</AppNotice>
			{/if}

			<div>
				<p class="danger-zone__heading">{heading}</p>
				<p class="danger-zone__copy">{description}</p>
			</div>
			<AppActionRow>
				<CwButton
					id="{idPrefix}-open-button"
					type="button"
					variant="danger"
					onclick={onDelete}
					loading={busy}
					disabled={busy || Boolean(blockedMessage)}
				>
					{buttonLabel}
				</CwButton>
			</AppActionRow>
		</AppFormStack>
	</CwCard>
</div>

<style>
	/* Red frame and heading so it reads as a different kind of card. */
	.danger-zone :global(.cw-card) {
		border-color: var(--cw-tone-danger-border);
	}

	.danger-zone :global(.cw-card__title) {
		color: var(--cw-tone-danger-text);
	}

	.danger-zone__heading {
		margin: 0 0 var(--cw-space-1);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.danger-zone__copy {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}
</style>
