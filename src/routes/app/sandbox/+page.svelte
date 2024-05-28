<script lang="ts">
    import WeatherKnob from '$lib/components/ui/WeatherKnob.svelte';
import type { PageData } from './$types';
    
    export let data: PageData;
</script>

<WeatherKnob/>