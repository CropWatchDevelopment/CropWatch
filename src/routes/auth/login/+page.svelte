<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { Avatar, Button, Card, Dialog, Header, TextField } from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import FAILED_SVG from '$lib/images/fail.svg';
	import { mdiEmail, mdiLock, mdiLogin } from '@mdi/js';
	import DISCORD_LOGO from '$lib/images/discord-logo-blue.svg';
	import GOOGLE_LOGO from '$lib/images/google-logo.svg';

	import { m } from '$lib/paraglide/messages.js'; // Import translations

	let { data } = $props();
	let loading: boolean = $state(false);
	let open: boolean = $state(false);

	// Client API:
	const { form, enhance, constraints, errors } = superForm(data, {
		validationMethod: 'oninput',
		onSubmit: async (values) => {
			loading = true;
		},
		onResult: async (event) => {
			if (event.result.status === 200) {
				document.location.href = '/app';
			} else {
				console.error('Login failed');
				loading = false;
				open = true;
			}
		}
	});
</script>

<svelte:head>
	<title>{m.auth_login_title()}</title>
</svelte:head>

<Card class="flex h-full w-full max-w-[480px] flex-col shadow sm:rounded-lg">
	<img src={LOGO_IMAGE} class="w-24 block mx-auto" alt="CropWatch LLC" />
	<h2 class="text-center">{m.auth_login_title()}</h2>

	<!-- Container to fill remaining space and manage layout -->
	<div class="flex flex-1 flex-col p-4">
		<form method="POST" action="?/passwordLogin" use:enhance class="w-full">
			<div>
				<label for="email" class="block text-sm/6 font-medium">{m.auth_login_email_label()}</label>
				<div class="mt-2">
					<TextField
						id="email"
						label={m.auth_login_email_label()}
						type="email"
						name="email"
						icon={mdiEmail}
						autocomplete="email"
						placeholder={m.auth_login_email_placeholder()}
						bind:value={$form.email}
						aria-invalid={$errors.email ? 'true' : undefined}
						error={$errors.email}
						class="pb-2"
					/>
				</div>
			</div>

			<div>
				<label for="password" class="block text-sm/6 font-medium"
					>{m.auth_login_password_label()}</label
				>
				<div class="mt-2">
					<TextField
						id="password"
						label={m.auth_login_password_label()}
						type="password"
						name="password"
						icon={mdiLock}
						autocomplete="current-password"
						bind:value={$form.password}
						placeholder={m.auth_login_password_placeholder()}
						aria-invalid={$errors.password ? 'true' : undefined}
						error={$errors.password}
						class="pb-2"
					/>
				</div>
			</div>

			<div class="flex items-center justify-between pb-2">
				<div class="flex items-center">
					<!-- <Checkbox id="remember-me" name="remember-me" size="sm">{m.auth_login_password_remember_me()}</Checkbox> -->
				</div>

				<div class="text-sm/6">
					<a href="/auth/forgot-password" class="font-semibold hover:text-indigo-500">
						{m.auth_login_password_forgot()}
					</a>
				</div>
			</div>

			<div>
				<Button
					class="w-full"
					{loading}
					disabled={loading}
					variant="fill"
					color="primary"
					icon={mdiLogin}
					size="lg"
					type="submit"
				>
					{m.auth_login_submit()}
				</Button>
			</div>
		</form>

		<!-- Flex grow to push the social login area to the bottom -->
		<span class="flex-grow"></span>

		<div class="flex w-full flex-col">
			<div class="relative mt-4">
				<div class="relative flex justify-center text-sm/6 font-medium">
					<span class="bg-white px-6 text-gray-900"></span>
				</div>
			</div>

			<div class="mt-6 grid grid-cols-2 gap-4">
				<form method="POST" action="?/googleLogin">
					<Button type="submit" variant="fill" class="w-full">
						<img src={GOOGLE_LOGO} alt="Google" width="30px" />
						<span class="text-sm/6 font-semibold">{m.auth_login_social_login_google()}</span>
					</Button>
				</form>
				<form method="POST" action="?/discordLogin">
					<Button type="submit" variant="fill" class="w-full">
						<img src={DISCORD_LOGO} alt="Discord" width="39px" />
						<span class="text-sm/6 font-semibold">{m.auth_login_social_login_discord()}</span>
					</Button>
				</form>
			</div>
			<a
				href="/auth/register"
				class="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
			>
				<img src={LOGO_IMAGE} alt="CropWatch LLC" width="25px" />
				<span class="text-sm/6 font-semibold">{m.auth_login_create_account()}</span>
			</a>
		</div>
	</div>
</Card>
<Dialog {open} width="sm" on:close={() => (open = false)}>
	<Header slot="header" class="mx-5">
		<div slot="avatar">
			<Avatar class="font-bold text-primary-content">
				<img src={FAILED_SVG} alt="incorrect email or password" />
			</Avatar>
		</div>
		<h2 slot="title">Login Failed</h2>
	</Header>
	<p class="mx-2">E-Mail OR Password Incorrect</p>
	<div slot="actions">
		<Button variant="fill" color="primary" on:click={() => (open = false)}>Close</Button>
	</div>
</Dialog>
