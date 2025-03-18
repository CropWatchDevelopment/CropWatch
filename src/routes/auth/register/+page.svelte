<script lang="ts">
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import {
		Avatar,
		Button,
		Card,
		Dialog,
		Header,
		Paginate,
		Step,
		Steps,
		TextField
	} from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import FAILED_SVG from '$lib/images/fail.svg';
	import {
		mdiEmail,
		mdiLock,
		mdiAccountPlus,
		mdiAccount,
		mdiBriefcase,
		mdiCardAccountDetails
	} from '@mdi/js';
	import { PUBLIC_RECAPTCHA_SITE_KEY } from '$env/static/public';

	let { data } = $props();
	let loading: boolean = $state(false);
	let open: boolean = $state(false);

	$effect(() => {
		if (window.grecaptcha) {
			window.grecaptcha.ready(async () => {
				window.grecaptcha
					.execute(PUBLIC_RECAPTCHA_SITE_KEY, { action: 'submit' })
					.then(async (token: string) => {
						$form.reCatchaToken = token;
					});
			});
		}
	});

	const { form, enhance, errors } = superForm(data.form, {
		validationMethod: 'oninput',
		dataType: 'json',
		onSubmit: async () => {
			loading = true;
		},
		onResult: async (event) => {
			loading = false;
			if (event.result.status === 200) {
				document.location.href = '/auth/check-email';
			} else {
				open = true;
			}
		}
	});
</script>

<svelte:head>
	<title>Register - CropWatch</title>
	<script
		src="https://www.google.com/recaptcha/api.js?render={PUBLIC_RECAPTCHA_SITE_KEY}"
		nonce="%sveltekit.nonce%"
	></script>
</svelte:head>

<div class="flex min-h-[calc(100vh-64px)] items-center justify-center">
	<Card class="flex h-full w-full max-w-[480px] flex-col shadow sm:rounded-lg">
		<Header
			title="Create a CropWatch Account"
			subheading="Join CropWatch to start managing your farm data"
			slot="header"
		>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>

		<div class="flex flex-1 flex-col p-4">
			<form
				method="POST"
				use:enhance
				class="w-full space-y-6"
			>

				<div>
					<input type="hidden" name="reCatchaToken" bind:value={$form.reCatchaToken} />
					<TextField
						id="username"
						label="Username*"
						type="text"
						name="username"
						icon={mdiAccount}
						autocomplete="username"
						placeholder="Choose a username"
						bind:value={$form.username}
						error={$errors.username}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="full_name"
						label="Full Name*"
						type="text"
						name="full_name"
						icon={mdiCardAccountDetails}
						autocomplete="name"
						placeholder="Enter your full name"
						bind:value={$form.full_name}
						error={$errors.full_name}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="employer"
						label="Employer"
						type="text"
						name="employer"
						icon={mdiBriefcase}
						autocomplete="organization"
						placeholder="Enter your employer's name (optional)"
						bind:value={$form.employer}
						error={$errors.employer}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="email"
						label="Email address*"
						type="email"
						name="email"
						icon={mdiEmail}
						autocomplete="email"
						placeholder="Enter your email address"
						bind:value={$form.email}
						error={$errors.email}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="password"
						label="Password*"
						type="password"
						name="password"
						icon={mdiLock}
						autocomplete="new-password"
						placeholder="Create a password"
						bind:value={$form.password}
						error={$errors.password}
						class="pb-2"
					/>
				</div>

				<div>
					<!-- <div>
						<Button on:click={() => steps} disabled={current.isFirst}>Previous</Button>
						<Button
							on:click={pagination.nextPage}
							color="primary"
							variant="fill"
							disabled={current.isLast}>Next</Button
						>
					</div> -->
					<TextField
						id="passwordConfirm"
						label="Confirm Password*"
						type="password"
						name="passwordConfirm"
						icon={mdiLock}
						autocomplete="new-password"
						placeholder="Confirm your password"
						bind:value={$form.passwordConfirm}
						error={$errors.passwordConfirm}
						class="pb-2"
					/>
				</div>

				<Button
					class="w-full"
					{loading}
					disabled={loading}
					variant="fill"
					color="primary"
					icon={mdiAccountPlus}
					size="lg"
					type="submit"
				>
					Create Account
				</Button>
			</form>

			<span class="flex-grow"></span>

			<div class="flex w-full flex-col">
				<div class="relative mt-4">
					<div class="relative flex justify-center text-sm/6 font-medium">
						<span class="bg-white px-6 text-gray-900">Or</span>
					</div>
				</div>

				<a
					href="/auth/login"
					class="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
				>
					<span class="text-sm/6 font-semibold">Already have an account? Sign in</span>
				</a>
			</div>
		</div>
	</Card>

	<Dialog {open} width="sm" on:close={() => (open = false)}>
		<Header slot="header" class="mx-5">
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={FAILED_SVG} alt="Registration failed" />
				</Avatar>
			</div>
			<h2 slot="title">Registration Failed</h2>
		</Header>
		<p class="mx-2">Unable to create account. Please try again later.</p>
		<div slot="actions">
			<Button variant="fill" color="primary" on:click={() => (open = false)}>Close</Button>
		</div>
	</Dialog>
</div>
