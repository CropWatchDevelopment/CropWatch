<script lang="ts">
	import { Avatar, Button, Card, Header } from 'svelte-ux';
	import { mdiArrowLeft, mdiAlert } from '@mdi/js';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
    import FAILED_SVG from '$lib/images/fail.svg';
</script>

<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
	<Card class="mx-auto w-full max-w-[480px] px-3 py-6 pb-6 shadow sm:rounded-lg sm:px-12">
		<Header slot="header">
			<h2 slot="title" class="text-2xl font-semibold">Password Update Failed</h2>
			<h3 slot="subheading">We couldn't update your password</h3>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center p-6 text-center">
			<!-- <svg
				class="h-24 w-24 text-danger"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
					stroke="currentColor"
					stroke-width="2"
				/>
				<path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				<path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg> -->
            <img src={FAILED_SVG} class="h-24 w-24 text-danger" alt="Failed" />


			<div class="mt-6 space-y-4">
				<p class="text-lg font-medium">Unable to Update Password</p>
				<p class="text-sm text-surface-content/70">
					We encountered an error while trying to update your password. This could be due to an
					expired link or a system error.
				</p>
				<p class="text-xs text-surface-content/50">
					Please contact our support team for assistance at support@cropwatch.com
				</p>
			</div>

			<div class="mt-8">
				<Button variant="outline" color="primary" icon={mdiArrowLeft} href="/auth/login">
					Back to login
				</Button>
			</div>
		</div>
	</Card>
</div>
