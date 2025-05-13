<script lang="ts">
	let { title, notation = ' ', min, max, avg } = $props();
</script>

<div class="stat-card">
	<h4>
		{title}
		{#if notation && notation !== ' '}
			<span class="notation">({notation})</span>
		{/if}
	</h4>
	<div class="stat-values">
		<div class="stat-item">
			<span class="stat-label">Min:</span>
			<span class="stat-value">
				{min}
				{#if notation}
					<sup>
						<small>
							{notation}
						</small>
					</sup>
				{/if}
			</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Max:</span>
			<span class="stat-value">
				{max}
				{#if notation}
					<sup>
						<small>
							{notation}
						</small>
					</sup>
				{/if}
			</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Avg:</span>
			<span class="stat-value">
				{avg}
				{#if notation}
					<sup>
						<small>
							{notation}
						</small>
					</sup>
				{/if}
			</span>
		</div>
	</div>
</div>

<style>
	@import 'StatsCard.css';
</style>
