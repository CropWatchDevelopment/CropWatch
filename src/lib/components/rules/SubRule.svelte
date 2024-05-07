<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { uuidv4 } from '$lib/utilities/uuidv4';
	import { SelectField, TextField } from 'svelte-ux';
	import type { Tables } from '../../../database.types';
	import { _ } from 'svelte-i18n';

	// export const latestData;
	export let root: Tables<'cw_rule_criteria'>;
	export let dataItem: any;

	// const onDelete = (i: number) => {
	// 	root.children.splice(i, 1);
	// 	root = root;
	// };
</script>

<div class="mb-2 border-2 p-1">
	<div class="flex flex-col gap-2">
		<div class="flex flex-row gap-1 justify-between">
			<div>
				<label for="action_recipient" class="text-surface-100">{$_('rules.if')} </label>
				<SelectField
					classes={{ root: 'w-full' }}
					placeholder={$_('rules.select_data')}
					label={$_('rules.data')}
					bind:value={root.subject}
					options={Object.keys(dataItem ?? {}).map((key) => {
						return { label: $_(key), value: key };
					})}
				/>
			</div>

			<div>
				<label for="action_recipient" class="text-surface-100">{$_('rules.is')}</label>
				<SelectField
					class="w-20"
					label={$_('rules.operator')}
					bind:value={root.operator}
					options={[
						{ value: '=', label: '=' },
						{ value: '!=', label: '!=' },
						{ value: '>', label: '>' },
						{ value: '>=', label: '>=' },
						{ value: '<', label: '<' },
						{ value: '<=', label: '<=' }
					]}
				/>
			</div>

			<div>
			<label for="action_recipient" class="text-surface-100">{$_('rules.thresholdValue')}: </label>
				<TextField type="decimal" label={$_('rules.trigger_value')} bind:value={root.trigger_value} />
			</div>
		</div>
		<div>
			<label for="action_recipient" class="text-surface-100"
				>{$_('rules.and_reset_when')} {$_(root.subject)} {$_('rules.returns_to')}:
			</label>
			<TextField type="decimal" label={$_('rules.reset_rule_value')} bind:value={root.reset_value} />
		</div>
	</div>
</div>
