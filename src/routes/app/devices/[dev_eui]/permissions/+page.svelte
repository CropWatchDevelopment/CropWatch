<script>
	import permissionsImage from '$lib/images/UI/cw_permissions.svg';
	import Back from '$lib/components/ui/Back.svelte';
	import DevicePermission from '$lib/components/ui/DevicePermission.svelte';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

    export let data;

    let devEui = $page.params.dev_eui;
</script>

<div
	class="flex flex-row bg-emerald-300 p-4 text-center justify-center text-surface-100 text-2xl items-center"
>
	<img src={permissionsImage} alt="rules icon" class="w-12 mr-2" />
	{$_('permissions.permissions')}
</div>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
</div>

<DevicePermission {devEui} permissions={data.userPermissions} />
