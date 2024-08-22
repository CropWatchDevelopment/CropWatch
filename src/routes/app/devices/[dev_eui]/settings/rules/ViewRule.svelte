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
						When the incoming {$_(criteria.subject)} from the device is {criteria.operator}
						{criteria.trigger_value}{nameToNotation(criteria.subject)},
					</p>
					{#if i < rule.criteria.length - 1}
						<p>OR</p>
					{/if}
				</div>
			{/each}

			<div class="bg-surface-200">
				<p>an Alert will be sent to the following Recipients</p>
				<ol>
					{#each recipients as recipient}
						<ListItem
							title={recipient}
							icon={mdiAccount}
							avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
						/>
					{/each}
				</ol>
			</div>
		</div>
	</DarkCard>
    <div slot="actions">
        <Button variant="fill" color="primary">Close</Button>
    </div>
</Dialog>
