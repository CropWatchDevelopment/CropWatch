<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		mdiCheckCircle,
		mdiChevronLeft,
		mdiDownload,
		mdiExclamation,
		mdiExclamationThick,
		mdiEye,
		mdiFunction,
		mdiPencil,
		mdiRestart,
		mdiRestore,
		mdiTrashCan
	} from '@mdi/js';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import { Avatar, Button, Dialog, Icon, ListItem, TextField, Toggle, Tooltip } from 'svelte-ux';
	import { toast } from '@zerodevx/svelte-toast';
	import moment from 'moment';
	import { _ } from 'svelte-i18n';

	// $: page.set({ ...page, title: "All Configured Rules" });
	export let data;
	let deleteConfirm = '';

	const deleteRule = async (id: number) => {
		const result = await fetch(`/api/rules?rule_id=${id}`, { method: 'DELETE' });
		if (result.status === 200) {
			console.log('Rule deleted successfully');
			toast.push('Rule deleted successfully');
		} else {
			console.error('Failed to delete rule');
			toast.push('Rule deleted Failed!');
		}
	};

	const resetRule = async (id: number) => {
		const result = await fetch(`/api/rules?rule_id=${id}`, { method: 'PUT', body: JSON.stringify({ reset: false }) });
		if (result.status === 201) {
			console.log('Rule reset successfully');
			toast.push('Rule reset successfully');
		} else {
			console.error('Failed to reset rule');
			toast.push('Rule reset Failed!');
		}
	};
</script>

<h1
	class="mb-2 flex items-center text-2xl font-bold border-b w-full text-white relative"
	style="background-image:url({backgroundImg}); width:100%; height: 100px;"
>
	<p class="my-auto ml-2"></p>
	<p class="my-auto"><Icon data={mdiFunction} />{$_('all_rules.title')}</p>
</h1>

<ul>
	{#each data.rules as rule}
		<ListItem
			title={rule.name}
			subheading={`${$_('all_rules.last_triggered')}: ${rule.last_triggered ? moment(rule.last_triggered) : $_('all_rules.last_triggered_timeName')}`}
		>
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon
						data={rule.is_triggered ? mdiExclamationThick : mdiCheckCircle}
						class={rule.is_triggered ? 'text-warning' : 'text-success'}
					/>
				</Avatar>
			</div>
			<div slot="actions" class="flex gap-4">
				{#if rule.is_triggered}

						<Toggle let:on={open} let:toggle>
							<Tooltip title={$_('all_rules.tooltip.resetRule')}>
								<Button icon={mdiRestart} on:click={toggle} color="success" />
							</Tooltip>
							<Dialog {open} on:close={toggle}>
								<div slot="title">{$_('all_rules.dialog.areYouSure')}</div>
								<div class="px-6 py-3">{$_('all_rules.dialog.ruleResetText')}</div>
								<div slot="actions">
									<Button on:click={async () => resetRule(rule.id)} variant="fill" color="info">
										{$_('all_rules.dialog.yes_reset_button')}
									</Button>
									<Button>{$_('all_rules.dialog.cancle')}</Button>
								</div>
							</Dialog>
						</Toggle>
				{/if}
				<Tooltip title={$_('all_rules.downloadIconTooltip')}>
					<Button variant="fill-light" icon={mdiDownload} color="info" />
				</Tooltip>
				<Tooltip title={$_('all_rules.ViewDeviceIconTooltip')}>
					<Button variant="fill-light" icon={mdiPencil} on:click={() => goto(``)} color="info" />
				</Tooltip>
				<Toggle let:on={open} let:toggle>
					<Tooltip title={$_('all_rules.deleteIconTooltip')}>
						<Button icon={mdiTrashCan} on:click={toggle} color="danger" />
					</Tooltip>
					<Dialog {open} on:close={toggle}>
						<div slot="title">{$_('all_rules.delete_dialog.areYouSure')}</div>
						<div class="px-6 py-3">
							{$_('all_rules.delete_dialog.caption')}
							<TextField label="Type: DELETE to enable delete button" on:change={(e) => { deleteConfirm = e.detail.value.toString(); }} />
						</div>
						<div slot="actions">
							<Button disabled={deleteConfirm !== 'DELETE'} on:click={async () => deleteRule(rule.id)} variant="fill" color="danger">
								{$_('all_rules.delete_dialog.yes_button_text')}
							</Button>
							<Button>{$_('all_rules.delete_dialog.cancle')}</Button>
						</div>
					</Dialog>
				</Toggle>
			</div>
		</ListItem>
	{/each}
</ul>
