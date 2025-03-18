<script lang="ts">
	import { Avatar, Button, Card, Header } from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import { mdiArrowLeft, mdiCheck } from '@mdi/js';
</script>

<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
	<Card class="mx-auto w-full max-w-[480px] px-3 py-6 pb-6 shadow sm:rounded-lg sm:px-12">
		<Header slot="header">
			<h2 slot="title" class="text-2xl font-semibold">Password Updated!</h2>
			<h3 slot="subheading">Your password has been successfully changed.</h3>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center p-6 text-center">
			<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
				<!-- Stable green circle -->
				<circle cx="50" cy="50" r="45" fill="none" stroke="#28a745" stroke-width="5" />

				<!-- Animated green check mark -->
				<!-- 
       The pathLength="100" allows us to use normalized values for 
       stroke-dasharray and stroke-dashoffset. We set both to 100 
       so the check mark is initially invisible. Then, the animation 
       reduces the dash offset to 0, "drawing" the check from left to right.
  -->
				<path
					d="M30 50 L45 65 L70 35"
					fill="none"
					stroke="#28a745"
					stroke-width="5"
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset="100"
				>
					<animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.5s" fill="freeze" />
				</path>
			</svg>

			<div class="mt-6 space-y-4">
				<p class="text-lg font-medium">Password Successfully Updated!</p>
				<p class="text-sm text-surface-content/70">
					Your password has been changed. You can now use your new password to sign in to your
					account.
				</p>
				<p class="text-xs text-surface-content/50">
					For security reasons, you will be signed out of all other devices now.
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
