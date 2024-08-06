<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button, Icon, Notification } from 'svelte-ux';
	import { mdiInbox } from '@mdi/js';

	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});
</script>

<slot />

<div class="absolute mt-5 z-50 w-[400px]">
	<Notification actions="below" closeIcon>
		<div slot="icon" class="self-start">
			<Icon data={mdiInbox} />
		</div>
		<div slot="title">Discussion moved</div>
		<div slot="description">
			Lorem ipsum dolor sit amet consectetur adipisicing elit oluptatum tenetur.
		</div>
		<div slot="actions">
			<Button color="primary">Undo</Button>
			<Button>Dismiss</Button>
		</div>
	</Notification>
</div>
