<script lang="ts">
	import CWButton from '../CWButton.svelte';
	import CWDuration from '../CWDuration.svelte';
	import CWSelect from '../CWSelect.svelte';
	import { buttonClasses, getColumnValue, resolveHref, toDate } from './helpers';
	import type { CellSnippet, ColumnConfig } from './types';

	let {
		item,
		col,
		cell = undefined
	}: {
		item: unknown;
		col: ColumnConfig;
		cell?: CellSnippet;
	} = $props();

	const linkHref = $derived(resolveHref(item, col));
</script>

{#if linkHref && col.type !== 'buttons' && col.type !== 'select' && col.type !== 'custom'}
	<a
		href={linkHref}
		class="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 hover:underline decoration-sky-400/70 decoration-1"
	>
		{@render content()}
	</a>
{:else}
	<div class="block">
		{@render content()}
	</div>
{/if}

{#snippet content()}
	{@const raw = getColumnValue(item, col)}
	{#if col.type === 'badge' && col.badges}
		{@const badge = col.badges[String(raw)]}
		{#if badge}
			<div class="flex items-center gap-2">
				{#if badge.dotClass}
					<span class={`h-2 w-2 rounded-full ${badge.dotClass} ${badge.dotClass === 'bg-rose-500' ? 'animate-pulse' : ''}`}></span>
				{/if}
				<span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.badgeClass ?? ''}`}>
					{badge.label ?? String(raw)}
				</span>
			</div>
		{:else}
			<span>{String(raw ?? '')}</span>
		{/if}
	{:else if col.type === 'stacked'}
		{@const secondary = (item as Record<string, unknown>)[col.secondaryKey ?? '']}
		<div class="flex flex-col text-left">
			<span class="text-base font-semibold text-slate-50">{raw}</span>
			{#if secondary}
				<span class="text-sm text-slate-400">{secondary}</span>
			{/if}
		</div>
	{:else if col.type === 'datetime'}
		{@const dt = toDate(raw)}
		<div class="flex flex-col">
			<span class="font-mono text-sm text-slate-300 md:text-base">
				{#if dt}
					<CWDuration date={dt} />
				{:else}
					—
				{/if}
			</span>
			{#if dt}
				<span class="font-mono text-xs text-slate-500">{dt.toLocaleString()}</span>
			{/if}
		</div>
	{:else if col.type === 'number'}
		<span class="font-mono text-base text-slate-50 font-medium">
			{Number(raw).toLocaleString()}{col.suffix ?? ''}
		</span>
	{:else if col.type === 'buttons' && col.buttons?.length}
		<div class="flex flex-wrap items-center gap-2">
			{#each col.buttons as btn, bIdx (bIdx)}
				{#if btn.variant === 'ghost'}
					<CWButton
						class={`${btn.class ?? ''}`}
						variant={btn.variant}
						onclick={() => btn.onClick?.(item)}
					>
						{btn.label}
					</CWButton>
				{:else}
					<button
						class={`${buttonClasses(btn.variant)} ${btn.class ?? ''}`}
						type="button"
						onclick={() => btn.onClick?.(item)}
					>
						{btn.label}
					</button>
				{/if}
			{/each}
		</div>
	{:else if col.type === 'select' && col.select}
		{@const selectConfig = col.select}
		{@const selectOptions = typeof selectConfig.options === 'function' ? selectConfig.options(item) : selectConfig.options}
		{@const isSelectDisabled = typeof selectConfig.disabled === 'function' ? selectConfig.disabled(item) : (selectConfig.disabled ?? false)}
		<CWSelect
			options={selectOptions}
			value={raw as string | number | null}
			placeholder={selectConfig.placeholder ?? 'Select...'}
			size={selectConfig.size ?? 'sm'}
			disabled={isSelectDisabled}
			onchange={(e) => {
				const target = e.currentTarget as HTMLSelectElement;
				const newValue =
					target.value === ''
						? null
						: isNaN(Number(target.value))
							? target.value
							: Number(target.value);
				selectConfig.onChange?.(item, newValue);
			}}
		/>
	{:else if col.type === 'custom' && cell}
		{@render cell({ item, col, value: raw })}
	{:else}
		<span class="text-slate-50">{raw}{col.suffix ?? ''}</span>
	{/if}
{/snippet}
