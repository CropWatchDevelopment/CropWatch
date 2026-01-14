<script lang="ts">
	interface SelectableDevice {
		id: string;
		name: string;
		status: string;
		temperatureC: number;
		humidity: number;
	}

	interface Props {
		devices: SelectableDevice[];
		selectedDevices?: SelectableDevice[];
		maxSelection?: number;
		placeholder?: string;
		class?: string;
	}

	let {
		devices = [],
		selectedDevices = $bindable([]),
		maxSelection = 10,
		placeholder = 'Search and select devices...',
		class: className = ''
	}: Props = $props();

	let search = $state('');
	let isOpen = $state(false);
	let inputRef: HTMLInputElement | null = null;

	const filteredDevices = $derived.by(() => {
		if (!search.trim()) return devices;
		const lowered = search.toLowerCase();
		return devices.filter(
			(d) =>
				d.name.toLowerCase().includes(lowered) ||
				d.id.toLowerCase().includes(lowered)
		);
	});

	const availableDevices = $derived(
		filteredDevices.filter((d) => !selectedDevices.some((s) => s.id === d.id))
	);

	function toggleDevice(device: SelectableDevice) {
		const idx = selectedDevices.findIndex((d) => d.id === device.id);
		if (idx >= 0) {
			selectedDevices = [...selectedDevices.slice(0, idx), ...selectedDevices.slice(idx + 1)];
		} else if (selectedDevices.length < maxSelection) {
			selectedDevices = [...selectedDevices, device];
		}
		search = '';
	}

	function removeDevice(device: SelectableDevice) {
		selectedDevices = selectedDevices.filter((d) => d.id !== device.id);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
			inputRef?.blur();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.device-selector')) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'online':
				return 'bg-emerald-400';
			case 'warning':
				return 'bg-amber-400';
			case 'offline':
				return 'bg-rose-400';
			default:
				return 'bg-slate-400';
		}
	};
</script>

<div class={`device-selector relative ${className}`}>
	<!-- Selected devices chips -->
	{#if selectedDevices.length > 0}
		<div class="mb-2 flex flex-wrap gap-2">
			{#each selectedDevices as device (device.id)}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-200"
				>
					<span class={`h-2 w-2 rounded-full ${getStatusColor(device.status)}`}></span>
					<span class="max-w-[150px] truncate">{device.name}</span>
					<button
						type="button"
						onclick={() => removeDevice(device)}
						class="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
						aria-label="Remove {device.name}"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<!-- Search input -->
	<div class="relative">
		<input
			bind:this={inputRef}
			type="text"
			bind:value={search}
			onfocus={() => (isOpen = true)}
			onkeydown={handleKeydown}
			placeholder={selectedDevices.length >= maxSelection
				? `Maximum ${maxSelection} devices selected`
				: placeholder}
			disabled={selectedDevices.length >= maxSelection}
			class="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
		/>
		<div class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
			<svg
				class="h-5 w-5 text-slate-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>
	</div>

	<!-- Dropdown -->
	{#if isOpen && availableDevices.length > 0}
		<div
			class="absolute left-0 right-0 top-full z-[100] mt-2 max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40"
		>
			{#each availableDevices as device (device.id)}
				<button
					type="button"
					onclick={() => toggleDevice(device)}
					class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/70"
				>
					<span class={`h-2.5 w-2.5 rounded-full ${getStatusColor(device.status)}`}></span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-slate-100">{device.name}</p>
						<p class="truncate text-xs text-slate-400">{device.id}</p>
					</div>
					<div class="text-right text-xs text-slate-400">
						<p>{device.temperatureC.toFixed(1)}°C</p>
						<p>{device.humidity.toFixed(0)}%</p>
					</div>
				</button>
			{/each}
		</div>
	{:else if isOpen && search && availableDevices.length === 0}
		<div
			class="absolute left-0 right-0 top-full z-[100] mt-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center shadow-xl shadow-black/40"
		>
			<p class="text-sm text-slate-400">No devices found matching "{search}"</p>
		</div>
	{/if}

	<!-- Helper text -->
	<p class="mt-2 text-xs text-slate-400">
		{selectedDevices.length} of {maxSelection} devices selected. Select 2 or more devices of the same type to compare.
	</p>
</div>
