<script lang="ts">
	import { browser } from '$app/environment';
	if (browser) {
		document.location.href = '/auth/login';
	}
</script>
