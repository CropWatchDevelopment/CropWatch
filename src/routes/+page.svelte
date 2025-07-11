<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
</script>

<a href="/auth/login" class="text-blue-500 hover:underline">
	{$_('Login')}
</a>
