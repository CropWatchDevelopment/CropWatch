<script lang="ts">
	import { fade, slide } from 'svelte/transition';

	type ValidationState = 'idle' | 'valid' | 'invalid' | 'incomplete';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		value?: string;
		label?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		size?: Size;
		showHelp?: boolean;
		class?: string;
	}

	let {
		value = $bindable(''),
		label = 'Device EUI',
		placeholder = 'Enter Device EUI',
		disabled = false,
		required = false,
		size = 'md',
		showHelp = true,
		class: className = ''
	}: Props = $props();

	// Internal state
	let isFocused = $state(false);
	let isTouched = $state(false);

	// DevEUI is exactly 16 hex characters
	const DEV_EUI_LENGTH = 16;
	const HEX_PATTERN = /^[A-Fa-f0-9]*$/;

	// Validation derived states
	const isValidHex = $derived(HEX_PATTERN.test(value));
	const isComplete = $derived(value.length === DEV_EUI_LENGTH);
	const isValid = $derived(isValidHex && isComplete);
	
	const validationState = $derived.by<ValidationState>(() => {
		if (!isTouched && value.length === 0) return 'idle';
		if (!isValidHex) return 'invalid';
		if (isComplete && isValidHex) return 'valid';
		if (value.length > 0 && value.length < DEV_EUI_LENGTH) return 'incomplete';
		return 'idle';
	});

	// Size classes
	const sizeClasses: Record<Size, { input: string; text: string; icon: string }> = {
		sm: { input: 'px-3 py-2', text: 'text-sm', icon: 'h-4 w-4' },
		md: { input: 'px-4 py-3', text: 'text-base', icon: 'h-5 w-5' },
		lg: { input: 'px-5 py-4', text: 'text-lg', icon: 'h-6 w-6' }
	};

	// Border color based on validation state
	const borderClass = $derived.by(() => {
		if (disabled) return 'border-slate-700 bg-slate-800/50';
		if (isFocused) {
			if (validationState === 'valid') return 'border-green-500 ring-2 ring-green-500/20';
			if (validationState === 'invalid') return 'border-red-500 ring-2 ring-red-500/20';
			return 'border-sky-500 ring-2 ring-sky-500/20';
		}
		if (validationState === 'valid') return 'border-green-500/50';
		if (validationState === 'invalid') return 'border-red-500/50';
		if (validationState === 'incomplete' && isTouched) return 'border-amber-500/50';
		return 'border-slate-700';
	});

	// Handle input - only allow hex characters and auto-uppercase
	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		// Remove any non-hex characters and convert to uppercase
		const cleaned = input.value.toUpperCase().replace(/[^A-F0-9]/g, '');
		// Limit to 16 characters
		value = cleaned.slice(0, DEV_EUI_LENGTH);
	}

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur() {
		isFocused = false;
		isTouched = true;
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') ?? '';
		// Clean pasted text: remove spaces, dashes, colons, and non-hex chars
		const cleaned = pastedText.toUpperCase().replace(/[\s\-:]/g, '').replace(/[^A-F0-9]/g, '');
		value = cleaned.slice(0, DEV_EUI_LENGTH);
		isTouched = true;
	}

	function clear() {
		value = '';
		isTouched = false;
	}

	// Validation message
	const validationMessage = $derived.by(() => {
		if (validationState === 'invalid') return 'Only hexadecimal characters (0-9, A-F) are allowed';
		if (validationState === 'incomplete' && isTouched) return `${DEV_EUI_LENGTH - value.length} more characters needed`;
		if (validationState === 'valid') return 'Valid Device EUI';
		return '';
	});
</script>

<div class="w-full {className}">
	<!-- Label -->
	{#if label}
		<div class="mb-1.5 flex items-center justify-between">
			<label for="dev-eui-input" class="text-sm font-medium text-slate-300">
				{label}
				{#if required}
					<span class="text-red-400">*</span>
				{/if}
			</label>
			<span class="text-xs tabular-nums {value.length === DEV_EUI_LENGTH ? 'text-green-400' : 'text-slate-400'}">
				{value.length}/{DEV_EUI_LENGTH}
			</span>
		</div>
	{/if}

	<!-- Input Container -->
	<div class="relative">
		<!-- Actual Input -->
		<div class="relative">
			<input
				id="dev-eui-input"
				type="text"
				{disabled}
				{required}
				maxlength={DEV_EUI_LENGTH}
				{placeholder}
				bind:value
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				onpaste={handlePaste}
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				class="w-full rounded-xl border bg-slate-800 font-mono uppercase tracking-[0.35em] text-slate-100 placeholder-slate-500 transition-all
					{sizeClasses[size].input} {sizeClasses[size].text} {borderClass}
					focus:outline-none
					disabled:cursor-not-allowed disabled:text-slate-400"
				style="caret-color: #38bdf8;"
			/>

			<!-- Status Icon -->
			<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
				{#if value.length > 0 && !disabled}
					<!-- Clear Button -->
					<button
						type="button"
						onclick={clear}
						class="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-300"
						aria-label="Clear input"
					>
						<svg class="{sizeClasses[size].icon}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}

				<!-- Validation Icon -->
				{#if validationState === 'valid'}
					<div transition:fade={{ duration: 150 }} class="text-green-400">
						<svg class="{sizeClasses[size].icon}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					</div>
				{:else if validationState === 'invalid'}
					<div transition:fade={{ duration: 150 }} class="text-red-400">
						<svg class="{sizeClasses[size].icon}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
				{:else if validationState === 'incomplete' && isTouched}
					<div transition:fade={{ duration: 150 }} class="text-amber-400">
						<svg class="{sizeClasses[size].icon}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-700/50">
		<div 
			class="h-full rounded-full transition-all duration-300 ease-out
				{validationState === 'valid' 
					? 'bg-green-500' 
					: validationState === 'invalid'
						? 'bg-red-500'
						: 'bg-sky-500'}"
			style="width: {(value.length / DEV_EUI_LENGTH) * 100}%"
		></div>
	</div>

	<!-- Validation Message -->
	{#if validationMessage && isTouched}
		<p 
			transition:slide={{ duration: 150 }}
			class="mt-1.5 flex items-center gap-1.5 text-xs
				{validationState === 'valid' 
					? 'text-green-400' 
					: validationState === 'invalid'
						? 'text-red-400'
						: 'text-amber-400'}"
		>
			{validationMessage}
		</p>
	{/if}

	<!-- Help Text -->
	{#if showHelp && !isTouched}
		<div class="mt-2 flex items-start gap-2">
			<svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-xs text-slate-400">
				Enter the 16-character hexadecimal Device EUI. You can find this on the device label or paste it directly (spaces/dashes will be removed).
			</p>
		</div>
	{/if}
</div>
