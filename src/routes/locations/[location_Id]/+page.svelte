<script lang="ts">
    import Back from "$lib/components/ui/Back.svelte";
import Date from "$lib/components/ui/Date.svelte";
	import NotificationsBell from "$lib/components/ui/NotificationsBell.svelte";
</script>
<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative h-screen px-4">
    <Date/>
    <div class="mt-8 flex justify-between">
        <Back/>
        <NotificationsBell/>
    </div>
</div>