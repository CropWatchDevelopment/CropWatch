<script lang="ts">
	import type { Snippet } from 'svelte';

	type SelectSize = 'sm' | 'md' | 'lg';

	interface SelectOption {
		value: string | number;
		label: string;
		image?: string;
		disabled?: boolean;
	}

	interface Props {
		options: SelectOption[];
		value?: string | number | null;
		placeholder?: string;
		label?: string;
		required?: boolean;
		requiredHint?: string;
		helpText?: string;
		loading?: boolean;
		disabled?: boolean;
		error?: string;
		size?: SelectSize;
		name?: string;
		id?: string;
		class?: string;
		children?: Snippet;
		onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
	}

	let {
		options,
		value = $bindable(null),
		placeholder = 'Select an option...',
		label = '',
		required = false,
		requiredHint = '',
		helpText = '',
		loading = false,
		disabled = false,
		error = '',
		size = 'md',
		name = '',
		id = '',
		class: className = '',
		onchange = undefined
	}: Props = $props();

	const uid = $props.id();
	const selectId = $derived(id || `cw-select-${uid}`);
	const isDisabled = $derived(disabled || loading);

	const sizeClasses: Record<SelectSize, string> = {
		sm: 'px-3 py-2 text-sm',
		md: 'px-4 py-3 text-base',
		lg: 'px-5 py-4 text-lg'
	};

	const baseSelectClasses =
		'w-full rounded-xl border bg-slate-800 text-slate-100 transition focus:outline-none focus:ring-2';

	const stateClasses = $derived(
		error
			? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
			: 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
	);

	const disabledClasses = 'cursor-not-allowed opacity-50';

	const selectClasses = $derived(
		[baseSelectClasses, sizeClasses[size], stateClasses, isDisabled ? disabledClasses : '', className]
			.filter(Boolean)
			.join(' ')
	);

	// Check if any options have images
	const hasImages = $derived(options.some((opt) => opt.image));
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-slate-300">
			{label}
			{#if required}
				<span class="text-red-400">*</span>
			{/if}
			{#if requiredHint}
				<span class="ml-1 text-xs text-slate-400">({requiredHint})</span>
			{/if}
		</label>
	{/if}

	<div class="relative">
		{#if loading}
			<div class="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2">
				<svg
					class="h-4 w-4 animate-spin text-slate-400"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			</div>
		{/if}

		<!-- 
			Note: Native select doesn't support images inside options in a cross-browser way.
			If images are provided, we display them as a visual indicator next to the select,
			but the actual option images would require a custom dropdown implementation.
		-->
		{#if hasImages && value}
			{@const selectedOption = options.find((opt) => opt.value === value)}
			{#if selectedOption?.image}
				<div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
					<img
						src={selectedOption.image}
						alt=""
						class="h-5 w-5 rounded object-cover"
					/>
				</div>
			{/if}
		{/if}

		<select
			id={selectId}
			{name}
			bind:value
			disabled={isDisabled}
			{required}
			class={selectClasses}
			class:pl-10={hasImages && value && options.find((opt) => opt.value === value)?.image}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
			onchange={onchange}
		>
			{#if placeholder}
				<option value="" disabled={required}>{placeholder}</option>
			{/if}
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>

		<!-- Custom dropdown arrow -->
		<div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
			<svg
				class="h-5 w-5 text-slate-400"
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
		</div>
	</div>

	{#if error}
		<p id="{selectId}-error" class="text-sm text-red-400">{error}</p>
	{:else if helpText}
		<!-- <p id="{selectId}-help" class="text-sm text-slate-400">{helpText}</p> -->
	{/if}
</div>

<style>
	/* Hide default select arrow */
	select {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-image: none;
	}

	/* Style for disabled options */
	select option:disabled {
		color: #64748b;
	}
</style>
