
<script>
	import { page } from '$app/stores';
	import { mdiDevices, mdiFunction, mdiInformation, mdiLock } from '@mdi/js';
	import { Icon } from 'svelte-ux';

	$: currentQuery = $page.url.searchParams.get('') || 'general'; // Default to "general" if no query is set
</script>

<div>
	<div class="hidden sm:block">
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex space-x-8" aria-label="Tabs">
				<a href="?general"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiDevices} class="h-5 w-5 {currentQuery === 'general' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>General</span>
				</a>
				<a href="?rules"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'rules' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiFunction} class="h-5 w-5 {currentQuery === 'rules' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>Rules</span>
				</a>
				<a href="?permissions"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'permissions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiLock} class="h-5 w-5 {currentQuery === 'permissions' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>Permissions</span>
				</a>
				<a href="?information"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'information' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiInformation} class="h-5 w-5 {currentQuery === 'information' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>Information</span>
				</a>
			</nav>
		</div>
	</div>
</div>
