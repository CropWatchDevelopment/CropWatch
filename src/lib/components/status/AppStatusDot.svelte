<script lang="ts">
	type Status = 'online' | 'offline' | 'loading' | 'warning';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		status?: Status;
		size?: Size;
		label?: string;
		showLabel?: boolean;
		class?: string;
	}

	const SIZE_MAP: Record<Size, { dot: string; ringInset: string }> = {
		sm: { dot: '0.5rem', ringInset: '0.16rem' },
		md: { dot: '0.625rem', ringInset: '0.2rem' },
		lg: { dot: '0.75rem', ringInset: '0.26rem' }
	};

	let {
		status = 'offline',
		size = 'md',
		label,
		showLabel = false,
		class: className = ''
	}: Props = $props();

	const statusLabel = $derived(
		label ??
			(status === 'online'
				? 'Online'
				: status === 'offline'
					? 'Offline'
					: status === 'warning'
						? 'Warning'
						: 'Loading')
	);

	const sizeConfig = $derived(SIZE_MAP[size]);
	const ringVisible = $derived(status === 'offline' || status === 'warning');
	const stackStyle = $derived.by(() => {
		const sizeValue = ringVisible
			? `calc(${sizeConfig.dot} + ${sizeConfig.ringInset} * 2)`
			: sizeConfig.dot;
		return `width:${sizeValue};height:${sizeValue};`;
	});
	const dotColor = $derived(
		status === 'online'
			? 'var(--cw-success-500)'
			: status === 'offline'
				? 'var(--cw-danger-500)'
				: 'var(--cw-warning-500)'
	);
	const ringColor = $derived(
		status === 'offline'
			? 'color-mix(in srgb, var(--cw-danger-500) 74%, transparent)'
			: 'color-mix(in srgb, var(--cw-warning-400) 62%, transparent)'
	);
	const dotStyle = $derived.by(() => {
		const styles = [
			`width:${sizeConfig.dot}`,
			`height:${sizeConfig.dot}`,
			`background-color:${dotColor}`,
			'box-shadow:0 0 0 1px color-mix(in srgb, var(--cw-bg-surface) 75%, transparent)'
		];

		if (status === 'offline') {
			styles.push(
				'animation-name:app-local-status-offline-core !important',
				'animation-duration:1.05s !important',
				'animation-timing-function:ease-in-out !important',
				'animation-iteration-count:infinite !important'
			);
		}

		if (status === 'loading') {
			styles.push(
				'animation-name:app-local-status-loading !important',
				'animation-duration:1.1s !important',
				'animation-timing-function:ease-in-out !important',
				'animation-iteration-count:infinite !important'
			);
		}

		return styles.join(';');
	});
	const ringStyle = $derived.by(() =>
		[
			`inset:-${sizeConfig.ringInset}`,
			`border:2px solid ${ringColor}`,
			status === 'offline'
				? 'animation-name:app-local-status-offline-ring !important'
				: 'animation-name:app-local-status-warning-ring !important',
			status === 'offline'
				? 'animation-duration:1.05s !important'
				: 'animation-duration:1.5s !important',
			'animation-timing-function:ease-out !important',
			'animation-iteration-count:infinite !important'
		].join(';')
	);
</script>

<span class={`app-status-dot ${className}`} role="status" aria-label={statusLabel}>
	<span class="app-status-dot__stack" style={stackStyle} aria-hidden="true">
		{#if ringVisible}
			<span class="app-status-dot__ring" style={ringStyle}></span>
		{/if}
		<span class="app-status-dot__dot" style={dotStyle}></span>
	</span>
	{#if showLabel}
		<span class="app-status-dot__label">{statusLabel}</span>
	{/if}
</span>

<style>
	.app-status-dot {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2, 0.5rem);
		overflow: visible;
	}

	.app-status-dot__stack {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.app-status-dot__dot,
	.app-status-dot__ring {
		position: absolute;
		border-radius: 9999px;
	}

	.app-status-dot__dot {
		display: inline-block;
		position: absolute;
		inset: 0;
		margin: auto;
	}

	.app-status-dot__label {
		font-size: var(--cw-text-sm, 0.875rem);
		color: var(--cw-text-secondary, rgb(148 163 184));
	}

	@keyframes -global-app-local-status-loading {
		0% {
			opacity: 0.55;
			transform: scale(0.92);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0.55;
			transform: scale(0.92);
		}
	}

	@keyframes -global-app-local-status-offline-core {
		0%,
		100% {
			transform: scale(0.9);
		}
		45% {
			transform: scale(1);
		}
	}

	@keyframes -global-app-local-status-offline-ring {
		0% {
			opacity: 0.7;
			transform: scale(0.62);
		}
		72% {
			opacity: 0;
			transform: scale(1.9);
		}
		100% {
			opacity: 0;
			transform: scale(1.9);
		}
	}

	@keyframes -global-app-local-status-warning-ring {
		0% {
			opacity: 0.68;
			transform: scale(0.65);
		}
		70% {
			opacity: 0;
			transform: scale(1.8);
		}
		100% {
			opacity: 0;
			transform: scale(1.8);
		}
	}
</style>
