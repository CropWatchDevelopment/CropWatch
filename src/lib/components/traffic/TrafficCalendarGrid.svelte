<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TrafficCalendarCell } from './traffic.types';

	let {
		weekdays = [],
		cells = [],
		selectedDate = null
	}: {
		weekdays?: string[];
		cells?: TrafficCalendarCell[];
		selectedDate?: string | null;
	} = $props();

	const dispatch = createEventDispatcher<{ select: { dateKey: string } }>();

	function handleSelect(dateKey: string | undefined) {
		if (!dateKey) return;
		dispatch('select', { dateKey });
	}
</script>

<div class="traffic-calendar">
	<div class="traffic-dow">
		{#each weekdays as day (day)}
			<div>{day}</div>
		{/each}
	</div>
	<div class="traffic-grid" role="grid" aria-label="Calendar grid">
		{#each cells as cell, index (index)}
			{#if !cell.inMonth}
				<div class="traffic-day out" aria-hidden="true"></div>
			{:else}
				<button
					type="button"
					class={`traffic-day ${cell.dateKey === selectedDate ? 'selected' : ''}`}
					data-date={cell.dateKey}
					role="gridcell"
					aria-label={cell.dateKey}
					onclick={() => handleSelect(cell.dateKey)}
					onkeydown={(event) => {
						if (event.key !== 'Enter' && event.key !== ' ') return;
						event.preventDefault();
						handleSelect(cell.dateKey);
					}}
				>
					<div class="traffic-day-top">
						<div class="traffic-date-num">{cell.dayNum}</div>
						{#if cell.weather}
							<div class="traffic-wx">
								<div class="icon">{cell.weather.icon}</div>
								<div class="temps">{cell.weather.tMinC}–{cell.weather.tMaxC}°</div>
							</div>
						{/if}
					</div>
					<div class="traffic-chips">
						{#each cell.entries ?? [] as entry (entry.key)}
							<span class={`traffic-chip-mini ${entry.dim ? 'dim' : ''}`}>
								{entry.short}{entry.value}
							</span>
						{/each}
					</div>
				</button>
			{/if}
		{/each}
	</div>
</div>

<style>
	.traffic-calendar {
		background: rgba(14, 26, 51, 0.58);
		border: 1px solid var(--traffic-line);
		border-radius: 18px;
		padding: 12px;
		box-shadow: var(--traffic-shadow);
	}

	.traffic-dow {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 10px;
		margin-bottom: 10px;
		position: sticky;
		top: 64px;
		z-index: 2;
		background: rgba(16, 28, 56, 0.92);
		border-radius: 14px;
		padding: 8px 10px;
		border: 1px solid var(--traffic-line);
		backdrop-filter: blur(10px);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
	}

	.traffic-dow div {
		color: rgba(242, 246, 255, 0.86);
		font-weight: 900;
		font-size: 14px;
		letter-spacing: 0.2px;
	}

	.traffic-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 10px;
	}

	.traffic-day {
		position: relative;
		border-radius: 16px;
		border: 1px solid var(--traffic-line);
		background: rgba(22, 36, 74, 0.82);
		padding: 12px;
		min-height: clamp(110px, 12vw, 150px);
		cursor: pointer;
		transition: transform 0.06s ease, border-color 0.06s ease, background 0.06s ease;
		outline: none;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
	}

	.traffic-day:hover {
		border-color: rgba(125, 184, 255, 0.95);
		transform: translateY(-1px);
	}

	.traffic-day.out {
		opacity: 0.2;
		cursor: default;
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.06);
		box-shadow: none;
	}

	.traffic-day.selected {
		border-color: rgba(242, 246, 255, 0.95);
		box-shadow: 0 0 0 2px rgba(125, 184, 255, 0.25) inset,
			0 14px 26px rgba(0, 0, 0, 0.22);
		background: rgba(28, 48, 92, 0.92);
	}

	.traffic-day-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
	}

	.traffic-date-num {
		font-weight: 950;
		font-size: 16px;
	}

	.traffic-wx {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: flex-end;
		text-align: right;
	}

	.traffic-wx .icon {
		font-size: 16px;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
	}

	.traffic-wx .temps {
		color: rgba(242, 246, 255, 0.78);
		font-size: 14px;
		font-weight: 800;
	}

	.traffic-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}

	.traffic-chip-mini {
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(11, 18, 32, 0.75);
		padding: 2px 7px;
		font-size: 14px;
		font-weight: 900;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		color: rgba(242, 246, 255, 0.95);
		white-space: nowrap;
	}

	.traffic-chip-mini.dim {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgba(242, 246, 255, 0.62);
	}

	@media (max-width: 980px) {
		.traffic-calendar {
			padding: 10px;
		}

		.traffic-dow {
			gap: 6px;
			padding: 6px 8px;
			margin-bottom: 8px;
		}

		.traffic-grid {
			gap: 6px;
		}

		.traffic-day {
			padding: 8px;
		}

		.traffic-chip-mini {
			font-size: 12px;
			padding: 3px 7px;
		}

		.traffic-wx .temps {
			font-size: 12px;
		}
	}
</style>
