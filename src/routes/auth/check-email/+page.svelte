<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { mdiArrowLeft } from '@mdi/js';
	import { goto } from '$app/navigation';
	export let form;

	let email: string = '';
	let password: string = '';
	let confirmPassword: string = '';
</script>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="bg-white px-6 py-12 shadow rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						✉️{$_('auth.check_email')}
					</h2>
				</div>

					<Button
						type="button"
						variant="fill-outline"
						color="primary"
                        icon={mdiArrowLeft}
                        on:click={() => goto('/auth/login') }
						classes={{ root: 'w-full' }}>{$_('auth.back_to_login')}</Button
					>
			</div>
		</div>
	</div>
</div>

<style>
	#login-background {
		transition: opacity 0.3s;
		opacity: 1;
		min-height: 100vh;
		margin: 0;
		background-attachment: fixed;
		background-image: url($lib/images/empty-greenhouse.jpg);
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center center;
	}
</style>
