<script lang="ts">
	import { mdiAccount, mdiEye } from '@mdi/js';
	import { Button, Card, Dialog, ListItem, Tooltip } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { nameToNotation } from '$lib/components/ui/utilities/NameToNotation';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';

	export let rule: Tables<'cw_rules'>;
	let open: boolean = false;
	let recipients: string[] = rule.action_recipient ? rule.action_recipient.split(',') : [];
</script>

<Tooltip title={$_('devices.rules.viewRule')}>
	<Button icon={mdiEye} variant="fill" color="info" on:click={() => (open = !open)} /></Tooltip
>
<Dialog bind:open>
	<DarkCard title={rule.name}>
		<div class="m-2">
			{#each rule.criteria as criteria, i}
				<div>
					<p>
						When the incoming <b>{$_(criteria.subject)}</b> from the device is <b>{criteria.operator} {criteria.trigger_value}{nameToNotation(criteria.subject)}</b>
					</p>
					{#if i < rule.criteria.length - 1}
						<p>OR</p>
					{/if}
				</div>
			

			<div>
				<p>an Alert will be sent to the following Recipients:</p>
				<ol>
					{#each recipients as recipient}
						<ListItem
							title={recipient}
							icon={mdiAccount}
							avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
						/>
					{/each}
				</ol>
				<p>and the rule will be reset when <b>{criteria.reset_value}{nameToNotation(criteria.subject)}</b></p>
			</div>
			{/each}
		</div>
	</DarkCard>
    <div slot="actions">
        <Button variant="fill" color="primary">Close</Button>
    </div>
</Dialog>
