<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { Avatar, Button, Card, Header, TextField } from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import { mdiArrowLeft, mdiEmail, mdiEmailArrowRight, mdiLock } from '@mdi/js';

	let { data } = $props();
	let loading : boolean = $state(false);

	const { form, enhance, constraints, errors } = superForm(data, {
		validationMethod: 'oninput',
		onChange: async (values) => {
			console.log(values);
		},
		onSubmit: async (values) => {
			console.log('Logging In...');
			loading = true;
		},
		onResult(event) {
			loading = false;
			if (event.result.status === 200) {
				document.location.href = '/auth/check-email';
			} else {
				alert(`Password Send FAILED`);
				console.log(event);
			}
		}
	});
</script>

<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
	<Card class="mx-auto w-full max-w-[480px] px-3 py-6 pb-6 shadow sm:rounded-lg sm:px-12">
		<Header slot="header">
			<h2 slot="title" class="text-2xl font-semibold">Forgot Password?</h2>
			<h3 slot="subheading">Enter your E-Mail Address below, we will send a recovery link.</h3>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center">
			<form method="POST" use:enhance class="w-full">
				<div>
					<label for="email" class="block text-sm/6 font-medium">Email address</label>
					<div class="mt-2">
						<TextField
							id="email"
							label="Email address"
							type="email"
							name="email"
							icon={mdiEmail}
							autocomplete="email"
							placeholder="Please enter your email address"
							bind:value={$form.email}
							aria-invalid={$errors.email ? 'true' : undefined}
							error={$errors.email}
							class="pb-2"
						/>
					</div>
				</div>

				<div class="flex flex-col gap-1 pt-4">
					<Button
						type="submit"
						variant="fill"
						disabled={loading}
						loading={loading}
						color="primary"
						class="w-full text-secondary"
						icon={mdiEmailArrowRight}>{loading ? 'Please wait while we process your request' : 'Send Email'}</Button
					>
					<Button
						variant="fill-outline"
						color="info"
						class="w-full text-secondary"
						icon={mdiArrowLeft}>Return To Login</Button
					>
				</div>
			</form>
		</div>
	</Card>
</div>
