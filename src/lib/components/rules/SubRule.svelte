<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { uuidv4 } from '$lib/utilities/uuidv4';
	import { SelectField, TextField } from 'svelte-ux';
	import type { Tables } from '../../../database.types';

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
				<label for="action_recipient" class="text-white">IF </label>
				<SelectField
					classes={{ root: 'w-full' }}
					placeholder="Sensor Data To Watch"
					label="Data"
					bind:value={root.subject}
					options={Object.keys(dataItem ?? {}).map((key) => {
						return { label: key, value: key };
					})}
				/>
			</div>

			<div>
				<label for="action_recipient" class="text-white">IS </label>
				<SelectField
					class="w-20"
					label="Operator"
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
				<label for="action_recipient" class="text-white">Value: </label>
				<TextField type="decimal" label="Trigger Value" bind:value={root.trigger_value} />
			</div>
		</div>
		<div>
			<label for="action_recipient" class="text-white"
				>And Reset when {root.subject} Return to:
			</label>
			<TextField type="decimal" label="Reset Rule Value" bind:value={root.reset_value} />
		</div>
	</div>
</div>
