<script lang="ts">
	import SensorPicker from "$lib/components/ui/SensorPicker.svelte";
    import Date from "$lib/components/ui/Date.svelte";
    import Back from "$lib/components/ui/Back.svelte";
    import NotificationsBell from "$lib/components/ui/NotificationsBell.svelte";

    const sensorName = 'Type 1'
    const data = {
        name: "Sensor CW-WJKL-123",
        soilTemperature: 21.6,
        optimalTemp: 24.33,
        moisture: 25.5,
        optimalMoisture: 25,
        ph: 6.3,
        optimalPh: 5.6,
        ec: 376,
        optimalEc: 1300,
        n: 27,
        optimalN: 25,
        p: 36,
        optimalP: 25,
        k: 91,
        optimalK: 25,
    }
</script>

<!-- In this page I will call for the information from a sensor -->
<!-- In order to display different info for each sensor I'll provide a component -->
<!-- This component will receive as one of the props a sensorName -->
<!-- Depending on the sensorName will display a component that contains info corresponding to it -->

<div class="relative px-4 bg-gradient-to-b from-[#132017] to-[#7F8D7F]">
    <Date/>
    <div class="mt-8 flex justify-between">
        <Back />
        <NotificationsBell />
    </div>
    <SensorPicker {sensorName} {data}/>
</div>
    
//Goto login or app page
<a href="/app/">CLICK</a>