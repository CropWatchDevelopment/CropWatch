<script lang="ts">
	import { locale, _ } from 'svelte-i18n';
	import type { Location } from '$lib/models/Location';

	let { location } = $props<{ location: Location }>();
</script>

<section>
	<h2>{$_('Location Details')}</h2>
	<div class="bg-card grid grid-rows-1 gap-2 rounded-lg p-4 text-sm shadow-sm">
		<div>
			<span class="text-text-muted">{$_('Location ID')}:</span>
			{location.location_id}
		</div>
		<div>
			<span class="text-text-muted">{$_('Created')}:</span>
			{new Date(location.created_at).toLocaleDateString($locale ?? undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</div>
		<div>
			<span class="text-text-muted">{$_('Coordinates')}:</span>
			{location.lat?.toFixed(6)}, {location.long?.toFixed(6)}
		</div>
	</div>
</section>
