<script lang="ts">
	export let temperature;
	export let humidity;
</script>

<div class="bg-[#34393f] bg-opacity-50 rounded-xl py-5 flex justify-center text-surface-100 my-3">
	<div
		class="h-80 w-80 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex justify-center items-center"
	>
		<div class="h-72 w-72 rounded-full bg-[#34393f] bg-opacity-80 flex justify-center items-center">
            <div class="text-center space-y-4">
                <p class="text-6xl text-center">{temperature}<span class="text-4xl text-[#A3A3A3]">ºC</span></p>
                <p class="text-4xl text-center">{humidity}<span class="text-xl text-[#A3A3A3]">RHS%</span></p>
            </div>
        </div>
	</div>
</div>
