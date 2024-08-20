<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { mdiCertificate, mdiCheckCircle, mdiKeyArrowRight } from '@mdi/js';
	import { Button, Checkbox } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';

	let loading: boolean = false;
	let allAccepted: boolean = false;
	let eula: boolean = false;
	let privacy: boolean = false;
	let cookie: boolean = false;

	$: allAccepted = eula && privacy && cookie;
</script>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="mx-2 rounded-lg bg-primary-50 px-6 py-12 shadow sm:px-12 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight">
						Before Continuing, please read, and accept the following agreements in order to use this
						application.
					</h2>
				</div>
				<form
					class="pb-1"
					action="?/accept_agreements"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter }) => {
						loading = true;
						return async ({ result, update }) => {
							if (result.status && result.status > 210) {
								notificationStore.NotificationTimedOpen({
									title: 'Error',
									description: result.data.message,
									icon: mdiCheckCircle,
									timeout: 3000,
									buttonText: 'Close'
								});
								loading = false;
							} else {
								await goto(result.data.redirect);
								loading = false;
							}
						};
					}}
				>
					<div class="mb-4 flex justify-center">
						<div class="flex w-full max-w-xs flex-col justify-start space-y-2">
							<div class="flex flex-row">
								<Checkbox size="lg" bind:checked={privacy}>Privacy Policy</Checkbox>
								<input type="hidden" name="privacy_accept" value={privacy} />
								<span class="flex flex-1" />
								<Button
									href="/legal/privacy-policy"
									target="_blank"
									variant="fill"
									icon={mdiKeyArrowRight}
								>
									Read
								</Button>
							</div>

							<div class="flex flex-row">
								<Checkbox size="lg" bind:checked={eula}>EULA</Checkbox>
								<input type="hidden" name="eula_accept" value={eula} />
								<span class="flex flex-1" />
								<Button href="/legal/eula" target="_blank" variant="fill" icon={mdiKeyArrowRight}>
									Read
								</Button>
							</div>

							<div class="flex flex-row">
								<Checkbox size="lg" bind:checked={cookie}>Cookie Policy</Checkbox>
								<input type="hidden" name="cookie_accept" value={cookie} />
								<span class="flex flex-1" />
								<Button
									href="/legal/cookie-policy"
									target="_blank"
									variant="fill"
									icon={mdiKeyArrowRight}
								>
									Read
								</Button>
							</div>
						</div>
					</div>

					<Button
						disabled={!allAccepted}
						{loading}
						icon={mdiCertificate}
						type="submit"
						class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-surface-100 shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>
						{#if !allAccepted}
							Please accept all agreements to continue
						{:else}
							Accept and Continue
						{/if}
					</Button>
				</form>
			</div>
		</div>
	</div>
</div>
