<script lang="ts">
	import type { Snippet } from 'svelte';

	type TabId = string | number;
	type TabIcon = string | Snippet;

	export type TabItem = {
		id?: TabId;
		label: string;
		icon?: TabIcon;
		disabled?: boolean;
		class?: string;
	};

	interface Props {
		tabs?: TabItem[];
		value?: TabId | null;
		class?: string;
		onChange?: (tab: TabItem, index: number) => void | Promise<void>;
	}

	let {
		tabs = [],
		value = $bindable<TabId | null>(null),
		class: className = '',
		onChange = undefined
	}: Props = $props();

	const baseGroupClasses =
		'inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1';

	const baseTabClasses =
		'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30';

	const selectedTabClasses = 'bg-slate-800 text-slate-200 font-semibold shadow-sm';
	const idleTabClasses = 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200';
	const disabledTabClasses = 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-400';

	const groupClasses = $derived([baseGroupClasses, className].filter(Boolean).join(' '));

	const tabIds = $derived.by(() => tabs.map((tab, index) => tab.id ?? index));

	const hasActiveValue = $derived.by(() => value != null && tabIds.includes(value));

	const activeValue = $derived.by(() => {
		if (value == null && tabIds.length) {
			return tabIds[0];
		}
		return value;
	});

	const isSelected = (tabId: TabId | undefined) => tabId === activeValue;

	const tabClasses = (tab: TabItem, tabId: TabId | undefined) =>
		[
			baseTabClasses,
			isSelected(tabId) ? selectedTabClasses : idleTabClasses,
			tab.disabled ? disabledTabClasses : '',
			tab.class ?? ''
		]
			.filter(Boolean)
			.join(' ');

	function handleSelect(tab: TabItem, tabId: TabId | undefined, index: number) {
		if (tab.disabled) return;
		if (tabId === undefined) return;
		if (tabId === activeValue) return;
		value = tabId;
		onChange?.(tab, index);
	}

	$effect(() => {
		if (!tabIds.length) return;
		const fallback = tabIds[0];
		if (value == null) {
			value = fallback;
			return;
		}
		if (!hasActiveValue) {
			value = fallback;
		}
	});
</script>

<div class={groupClasses} role="tablist">
	{#each tabs as tab, index (tabIds[index] ?? index)}
		<button
			type="button"
			class={tabClasses(tab, tabIds[index])}
			role="tab"
			aria-selected={isSelected(tabIds[index])}
			tabindex={isSelected(tabIds[index]) ? 0 : -1}
			disabled={tab.disabled}
			onclick={() => handleSelect(tab, tabIds[index], index)}
		>
			{#if tab.icon}
				<span class="flex h-5 w-5 items-center justify-center" aria-hidden="true">
					{#if typeof tab.icon === 'string'}
						<img src={tab.icon} alt="" class="h-5 w-5" />
					{:else}
						{@render tab.icon()}
					{/if}
				</span>
			{/if}
			<span class="whitespace-nowrap">{tab.label}</span>
		</button>
	{/each}
</div>
