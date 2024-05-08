<script>
	import { mdiArrowLeft } from "@mdi/js";
    import { _ } from 'svelte-i18n';
	import { Button } from "svelte-ux";

</script>
<div class="flex flex-col w-screen, h-screen justify-center text-center text-5xl">
    <p>{$_('auth.check_email')}</p>
    <span class="flex-grow" />
    <Button href="/auth/login" variant="fill" color="primary" class="w-full" icon={mdiArrowLeft} size="lg">{$_('auth.back_to_login')}</Button>
</div>