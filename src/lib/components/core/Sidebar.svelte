<script>

	import { mdiCog, mdiDevices, mdiFunction, mdiMap, mdiShield, mdiShieldLock, mdiViewDashboard } from "@mdi/js";
	import { ListItem } from "svelte-ux";

</script>
<ol>
    <ListItem title="Dashboard" icon={mdiViewDashboard} />
    <ListItem title="Locations" icon={mdiMap} />
    <ListItem title="Devices" icon={mdiDevices} />
    <ListItem title="Rules" icon={mdiFunction} />
    <ListItem title="Permissions" icon={mdiShieldLock} />
    <ListItem title="App Settings" icon={mdiCog} />
</ol>