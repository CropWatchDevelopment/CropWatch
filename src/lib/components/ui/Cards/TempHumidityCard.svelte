<script lang="ts">
    export let temperature;
    export let humidity;

    // Reactive statement to compute background color based on temperature
    $: bgColor = computeColor(temperature);

    function computeColor(temp: number): string {
        // Temperature range from -40 to +150
        const minTemp = -20;
        const maxTemp = 40;
        
        // Normalize temperature to a 0-1 scale
        const normalized = (temp - minTemp) / (maxTemp - minTemp);

        // Calculate the red and blue components based on temperature
        const red = Math.round(255 * normalized);
        const blue = Math.round(255 * (1 - normalized));
        
        // Return the computed RGB color
        return `rgb(${red}, 0, ${blue})`;
    }
</script>

<div class="bg-secondary bg-opacity-50 rounded-xl py-5 flex justify-center my-3">
    <div
        class="h-60 w-60 rounded-full bg-gradient-to-r from-[#375270] to-[#2108b4] flex justify-center items-center my-auto"
        style="background: linear-gradient(to right, {bgColor} 0%, {bgColor} 100%);"
    >
	<div class="h-56 w-56 rounded-full bg-secondary bg-opacity-80 flex justify-center items-center">
        <div class="h-56 w-56 rounded-full bg-secondary bg-opacity-80 flex justify-center items-center">
            <div class="text-center space-y-4">
                <p class="text-5xl text-center text-surface-50">{temperature}<sup class="text-3xl text-surface-100">ºC</sup></p>
                <p class="text-xl text-center">{humidity}<span class="text-xl text-[#A3A3A3]">%</span></p>
            </div>
        </div>
		</div>
    </div>
</div>