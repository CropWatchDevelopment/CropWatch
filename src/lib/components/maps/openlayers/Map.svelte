<script lang="ts">
    // OpenLayers
    import  Map  from 'ol/Map';
    import TileLayer from 'ol/layer/Tile';

    // Svelte
    import View from 'ol/View';
    import OSM from 'ol/source/OSM';
    import { fromLonLat } from 'ol/proj';
    
	import { uuidv4 } from '$lib/utilities/uuidv4';

    export let lat: number = 0;
    export let lng: number = 0;
    const coords = fromLonLat([lng, lat]);
    console.log('coords', coords);

    // Exports
    let mapId = uuidv4();
    // Local state
    let map: Map | null = null;

    // functions
    const setupMap = (node: HTMLElement) => {
        const osmLayer = new TileLayer({
            source: new OSM()
        })
        map = new Map({
            target: node.id,
            layers: [
                osmLayer,
            ],
            view: new View({
                center: coords,
                zoom: 12,
            })
        });
        return {
            destroy() {
                if (map) { // as Map
                    map.setTarget(undefined);
                    map = null;
                }
            }
        }
    }
</script>
<div id={mapId} class="map" use:setupMap>
</div>

<style>
    .map {
        width: 100%;
        height: 400px;
    }
</style>