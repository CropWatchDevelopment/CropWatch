<!-- <script>
	import { enhance } from '$app/forms';
	import { ReverseOperator } from '$lib/utilities/ReverseOfOperators';
	import { mdiEye } from '@mdi/js';
	import { Button, Card, Dialog, Toggle, Tooltip } from 'svelte-ux';

	let { rule } = $props();
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Tooltip title="View Rule" position="bottom">
		<Button icon={mdiEye} on:click={toggle} color="info" variant="outline" class="ml-5">
			<b class="hidden md:inline">View Rule</b>
		</Button>
	</Tooltip>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">Rule Name: {rule.name}</div>
        
        <Card>
            <h2>WHEN</h2>
            {#each rule.cw_rule_criteria as criterium, i}
                <p>{criterium.subject} is {criterium.operator} {criterium.trigger_value}</p>
                {#if i < rule.cw_rule_criteria.length - 1}
                    <p>AND</p>
                {/if}
            {/each}
            <h2>THEN</h2>
            <p>
                an
                {#if rule.babylon_notifier_type == 1}
                    email
                {/if}
                {#if rule.babylon_notifier_type == 2}
                    SMS
                {/if}
                {#if rule.babylon_notifier_type == 3}
                    webhook
                {/if}
                {#if rule.babylon_notifier_type == 4}
                    push notification
                {/if}
                will be sent to
                {rule.action_recipient}
            </p>

            <p>This rule is currently {rule.is_triggered ? 'Triggered' : 'Not Triggered'}</p>

            <h2>Finally</h2>
            <p>
                This rule will reset when:
                {#each rule.cw_rule_criteria as criterium, i}
                    {criterium.subject} is {ReverseOperator(criterium.operator)} {criterium.reset_value}
                    {#if i < rule.cw_rule_criteria.length - 1}
                        AND
                    {/if}
                {/each}
            </p>

            <small>(This rule has been triggered {rule.trigger_count} times.)</small>
        </Card>
        
		<div slot="actions">
            <Button on:click={toggleOff}>Close</Button>
		</div>
	</Dialog>
</Toggle> -->



<script>
	import { enhance } from '$app/forms';
	import { ReverseOperator } from '$lib/utilities/ReverseOfOperators';
	import { mdiEye } from '@mdi/js';
	import { Button, Card, Dialog, Toggle, Tooltip } from 'svelte-ux';

	let { rule } = $props();
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Tooltip title="View Rule" position="bottom">
		<Button icon={mdiEye} on:click={toggle} color="info" variant="outline" class="ml-5">
			<b class="hidden md:inline">View Rule</b>
		</Button>
	</Tooltip>
	<Dialog {open} on:close={toggleOff} class="max-w-md">
		<div slot="title" class="text-xl font-bold flex items-center gap-2">
			<span class="text-info">Rule:</span> {rule.name}
		</div>
        
        <Card class="p-6">
            <section class="mb-6">
                <h2 class="text-lg font-semibold text-info mb-3 border-b pb-1">WHEN</h2>
                <div class="pl-4">
                    {#each rule.cw_rule_criteria as criterium, i}
                        <div class="py-1">
                            <span class="font-medium">{criterium.subject}</span> is 
                            <span class="italic">{criterium.operator}</span> 
                            <span class="font-mono px-1 rounded">{criterium.trigger_value}</span>
                        </div>
                        {#if i < rule.cw_rule_criteria.length - 1}
                            <div class="text-center text-sm text-gray-500 my-1">AND</div>
                        {/if}
                    {/each}
                </div>
            </section>
            
            <section class="mb-6">
                <h2 class="text-lg font-semibold text-info mb-3 border-b pb-1">THEN</h2>
                <div class="pl-4 flex gap-1 flex-wrap">
                    <span>An</span>
                    <span class="font-medium">
                        {#if rule.babylon_notifier_type == 1}
                            email
                        {:else if rule.babylon_notifier_type == 2}
                            SMS
                        {:else if rule.babylon_notifier_type == 3}
                            webhook
                        {:else if rule.babylon_notifier_type == 4}
                            push notification
                        {/if}
                    </span>
                    <span>will be sent to</span>
                    <span class="font-medium">{rule.action_recipient}</span>
                </div>
            </section>

            <div class="text-center my-4">
                <span class={`inline-block px-3 py-1 rounded-full text-sm font-medium ${rule.is_triggered ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {rule.is_triggered ? 'Currently Triggered' : 'Not Triggered'}
                </span>
            </div>

            <section class="mb-4">
                <h2 class="text-lg font-semibold text-info mb-3 border-b pb-1">RESET WHEN</h2>
                <div class="pl-4">
                    {#each rule.cw_rule_criteria as criterium, i}
                        <div class="py-1">
                            <span class="font-medium">{criterium.subject}</span> is 
                            <span class="italic">{ReverseOperator(criterium.operator)}</span> 
                            <span class="font-mono px-1 rounded">{criterium.reset_value}</span>
                        </div>
                        {#if i < rule.cw_rule_criteria.length - 1}
                            <div class="text-center text-sm text-gray-500 my-1">AND</div>
                        {/if}
                    {/each}
                </div>
            </section>

            <div class="text-right text-sm text-gray-500 mt-4">
                Triggered {rule.trigger_count} {rule.trigger_count === 1 ? 'time' : 'times'}
            </div>
        </Card>
        
		<div slot="actions" class="flex justify-end gap-2 mt-4">
            <Button on:click={toggleOff} variant="outline" class="px-6">Close</Button>
		</div>
	</Dialog>
</Toggle>