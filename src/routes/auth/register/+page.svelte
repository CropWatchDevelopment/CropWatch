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
	import { dev } from '$app/environment';

	let { data } = $props();
	let loading: boolean = $state(false);
	let open: boolean = $state(false);
	let tokenState: string = $state('');

	$effect(() => {
		if (window.grecaptcha) {
			window.grecaptcha.ready(async () => {
				window.grecaptcha
					.execute(PUBLIC_RECAPTCHA_SITE_KEY, { action: 'submit' })
					.then(async (token: string) => {
						tokenState = token;
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
	<title>登録 - CropWatch</title>
	<script
		src="https://www.google.com/recaptcha/api.js?render={PUBLIC_RECAPTCHA_SITE_KEY}"
		nonce="%sveltekit.nonce%"
	></script>
</svelte:head>

<div class="flex min-h-[calc(100vh-64px)] items-center justify-center">
	<Card class="flex h-full w-full max-w-[480px] flex-col shadow sm:rounded-lg">
		<Header
			title="CropWatchアカウントを作成"
			subheading="CropWatchに参加して、センサーのデータ管理を始めましょう"
			slot="header"
		>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
{tokenState}
		<div class="flex flex-1 flex-col p-4">
			<form method="POST" use:enhance class="w-full space-y-6">
				<div>
					<input type="hidden" id="reCatchaToken" name="reCatchaToken" bind:value={tokenState} />
					<TextField
						id="username"
						label="ユーザー名*"
						type="text"
						name="username"
						icon={mdiAccount}
						autocomplete="username"
						placeholder="ユーザー名を選択"
						bind:value={$form.username}
						error={$errors.username}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="full_name"
						label="氏名*"
						type="text"
						name="full_name"
						icon={mdiCardAccountDetails}
						autocomplete="name"
						placeholder="氏名を入力してください"
						bind:value={$form.full_name}
						error={$errors.full_name}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="employer"
						label="勤務先"
						type="text"
						name="employer"
						icon={mdiBriefcase}
						autocomplete="organization"
						placeholder="勤務先の名前を入力してください（任意）"
						bind:value={$form.employer}
						error={$errors.employer}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="email"
						label="メールアドレス*"
						type="email"
						name="email"
						icon={mdiEmail}
						autocomplete="email"
						placeholder="メールアドレスを入力してください"
						bind:value={$form.email}
						error={$errors.email}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="password"
						label="パスワード*"
						type="password"
						name="password"
						icon={mdiLock}
						autocomplete="new-password"
						placeholder="パスワードを作成してください"
						bind:value={$form.password}
						error={$errors.password}
						class="pb-2"
					/>
				</div>

				<div>
					<TextField
						id="passwordConfirm"
						label="パスワード確認*"
						type="password"
						name="passwordConfirm"
						icon={mdiLock}
						autocomplete="new-password"
						placeholder="パスワードを確認してください"
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
					アカウントを作成
				</Button>
			</form>

			<span class="flex-grow"></span>

			<div class="flex w-full flex-col">
				<div class="relative mt-4">
					<div class="relative flex justify-center text-sm/6 font-medium">
						<span class="bg-white px-6 text-gray-900">または</span>
					</div>
				</div>

				<a
					href="/auth/login"
					class="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
				>
					<span class="text-sm/6 font-semibold">既にアカウントをお持ちですか？サインイン</span>
				</a>
			</div>
		</div>
		{#if dev}
			<SuperDebug bind:data={$form} />
		{/if}
	</Card>

	<Dialog {open} width="sm" on:close={() => (open = false)}>
		<Header slot="header" class="mx-5">
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={FAILED_SVG} alt="登録に失敗しました" />
				</Avatar>
			</div>
			<h2 slot="title">登録に失敗しました</h2>
		</Header>
		<p class="mx-2">アカウントを作成できませんでした。後でもう一度お試しください。</p>
		<div slot="actions">
			<Button variant="fill" color="primary" on:click={() => (open = false)}>閉じる</Button>
		</div>
	</Dialog>
</div>
