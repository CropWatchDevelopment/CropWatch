<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { DeviceStatus } from '$lib/types/DeviceStatus.type';
	import CWDuration from './CWDuration.svelte';

	export type DeviceMetric = {
		label: string;
		value: string | number;
		unit?: string;
		icon?: string | Snippet;
		iconAlt?: string;
	};

	interface Props {
		name: string;
		status?: DeviceStatus;
		primary?: DeviceMetric | null;
		secondary?: DeviceMetric | null;
		details?: DeviceMetric[];
		lastSeen?: Date | null;
		lastSeenLabel?: string;
		lastSeenSuffix?: string;
		detailHref?: string;
		detailLabel?: string;
		expanded?: boolean;
		class?: string;
		onView?: () => void;
	}

	let {
		name,
		status = 'loading',
		primary = null,
		secondary = null,
		details = [],
		lastSeen = null,
		lastSeenLabel = 'Last sent',
		lastSeenSuffix = 'ago',
		detailHref = '',
		detailLabel = 'View device details',
		expanded = $bindable(false),
		class: className = '',
		onView
	}: Props = $props();

	const detailsId = $props.id();

	const normalizedStatus = $derived.by(() => {
		if (status === 'online' || status === 'offline' || status === 'loading' || status === 'alert') {
			return status;
		}
		return 'loading';
	});

	const statusBarClass = $derived.by(() => {
		switch (normalizedStatus) {
			case 'online':
				return 'bg-emerald-500';
			case 'offline':
			case 'alert':
				return 'bg-rose-500';
			default:
				return 'bg-slate-500';
		}
	});

	const containerClass = $derived.by(() =>
		[
			'relative w-full min-h-[72px] rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/30',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const detailItems = $derived.by(() => {
		const items: DeviceMetric[] = [];
		if (primary) items.push(primary);
		if (secondary) items.push(secondary);
		if (details?.length) items.push(...details);
		return items;
	});

	const hasDetails = $derived.by(() => detailItems.length > 0 || Boolean(lastSeen));
</script>

<div class={containerClass}>
	<span class={`absolute left-0 top-0 h-full w-1.5 ${statusBarClass}`} aria-hidden="true"></span>
	<div class="flex min-h-[72px] items-stretch pl-2">
		<div class="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
			<div class="flex items-start justify-between gap-3">
				<h3 class="min-w-0 truncate text-sm font-semibold text-slate-100">{name}</h3>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				{#if primary}
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/80">
							{#if primary.icon}
								{#if typeof primary.icon === 'string'}
									<img
										src={primary.icon}
										alt={primary.iconAlt ?? ''}
										class="h-4 w-4"
										aria-hidden={primary.iconAlt ? undefined : 'true'}
									/>
								{:else}
									<span class="h-4 w-4 text-slate-200" aria-hidden="true">
										{@render primary.icon()}
									</span>
								{/if}
							{:else}
								<span class="h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden="true"></span>
							{/if}
						</span>
						<span class="text-base font-semibold text-slate-100">{primary.value}</span>
						{#if primary.unit}
							<span class="text-xs text-slate-400">{primary.unit}</span>
						{/if}
					</div>
				{/if}
				{#if secondary}
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/80">
							{#if secondary.icon}
								{#if typeof secondary.icon === 'string'}
									<img
										src={secondary.icon}
										alt={secondary.iconAlt ?? ''}
										class="h-4 w-4"
										aria-hidden={secondary.iconAlt ? undefined : 'true'}
									/>
								{:else}
									<span class="h-4 w-4 text-slate-200" aria-hidden="true">
										{@render secondary.icon()}
									</span>
								{/if}
							{:else}
								<span class="h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden="true"></span>
							{/if}
						</span>
						<span class="text-base font-semibold text-slate-100">{secondary.value}</span>
						{#if secondary.unit}
							<span class="text-xs text-slate-400">{secondary.unit}</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		<div class="flex items-center border-l border-slate-800 px-2">
			<button
				type="button"
				class="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
				aria-expanded={expanded}
				aria-controls={`${detailsId}-details`}
				aria-label={expanded ? `Collapse ${name} details` : `Expand ${name} details`}
				onclick={() => (expanded = !expanded)}
			>
				<svg
					class={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	{#if expanded}
		<div
			id={`${detailsId}-details`}
			class="border-t border-slate-800 px-4 pb-3 pt-3"
			transition:slide={{ duration: 150 }}
		>
			<p class="text-xs font-semibold text-slate-300">Details</p>
			{#if hasDetails}
				<div class="mt-2 divide-y divide-slate-800">
					{#each detailItems as item, index (`${item.label}-${index}`)}
						<div class="flex items-center justify-between py-2">
							<div class="flex min-w-0 items-center gap-2 text-slate-400">
								<span class="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800/80">
									{#if item.icon}
										{#if typeof item.icon === 'string'}
											<img
												src={item.icon}
												alt={item.iconAlt ?? ''}
												class="h-3.5 w-3.5"
												aria-hidden={item.iconAlt ? undefined : 'true'}
											/>
										{:else}
											<span class="h-3.5 w-3.5 text-slate-200" aria-hidden="true">
												{@render item.icon()}
											</span>
										{/if}
									{:else}
										<span class="h-2 w-2 rounded-full bg-slate-500" aria-hidden="true"></span>
									{/if}
								</span>
								<span class="truncate text-xs font-medium">{item.label}</span>
							</div>
							<div class="flex items-baseline gap-1 text-xs font-semibold text-slate-100">
								<span>{item.value}</span>
								{#if item.unit}
									<span class="text-[10px] text-slate-400">{item.unit}</span>
								{/if}
							</div>
						</div>
					{/each}
					{#if lastSeen}
						<div class="flex items-center justify-between py-2">
							<div class="flex min-w-0 items-center gap-2 text-slate-400">
								<span class="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800/80">
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</span>
								<span class="truncate text-xs font-medium">{lastSeenLabel}</span>
							</div>
							<div class="flex items-baseline gap-1 text-xs font-semibold text-slate-100">
								<CWDuration date={lastSeen} />
								{#if lastSeenSuffix}
									<span class="text-[10px] text-slate-400">{lastSeenSuffix}</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<p class="mt-2 text-xs text-slate-500">No device data yet.</p>
			{/if}

			<div class="mt-3">
				{#if detailHref}
					<a
						href={detailHref}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/70 px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700/70"
					>
						<span>{detailLabel}</span>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</a>
				{:else}
					<button
						type="button"
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/70 px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={() => onView?.()}
						disabled={!onView}
					>
						<span>{detailLabel}</span>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
