<script lang="ts">
	import { onMount } from 'svelte';

	type Unit = 'second' | 'minute' | 'hour' | 'day';
	type DisplayUnit = 'auto' | Unit;
	type Format = 'short' | 'long';

	let {
		date,
		display = 'auto',
		format = 'short'
	}: {
		date: Date;
		display?: DisplayUnit;
		format?: Format;
	} = $props();

	let nowMs = $state<number>(Date.now());

	onMount(() => {
		const interval = setInterval(() => {
			nowMs = Date.now();
		}, 1000);

		return () => clearInterval(interval);
	});

	function pluralize(unit: Unit, value: number): string {
		if (value === 1) return unit;
		return `${unit}s`;
	}

	function formatDuration(value: number, unit: Unit, style: Format): string {
		if (style === 'long') {
			return `${value} ${pluralize(unit, value)}`;
		}

		switch (unit) {
			case 'second':
				return `${value}s`;
			case 'minute':
				return `${value}m`;
			case 'hour':
				return `${value}h`;
			case 'day':
				return `${value}d`;
		}
	}

	const dateMs = $derived(date.getTime());
	const isValid = $derived(Number.isFinite(dateMs));
	const diffMs = $derived(isValid ? Math.abs(nowMs - dateMs) : 0);

	const unit = $derived.by((): Unit => {
		if (display !== 'auto') return display;

		const seconds = diffMs / 1000;
		if (seconds < 60) return 'second';

		const minutes = seconds / 60;
		if (minutes < 60) return 'minute';

		const hours = minutes / 60;
		if (hours < 24) return 'hour';

		return 'day';
	});

	const value = $derived.by((): number => {
		switch (unit) {
			case 'second':
				return Math.floor(diffMs / 1000);
			case 'minute':
				return Math.floor(diffMs / (60 * 1000));
			case 'hour':
				return Math.floor(diffMs / (60 * 60 * 1000));
			case 'day':
				return Math.floor(diffMs / (24 * 60 * 60 * 1000));
		}
	});

	const text = $derived.by(() => {
		if (!isValid) return '—';
		return formatDuration(value, unit, format);
	});
</script>

<span>{text}</span>
