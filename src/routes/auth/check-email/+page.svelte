<script lang="ts">
	import { Avatar, Button, Card, Header } from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import { mdiArrowLeft } from '@mdi/js';

	let { data } = $props();
</script>

<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
	<Card class="mx-auto w-full max-w-[480px] px-3 py-6 pb-6 shadow sm:rounded-lg sm:px-12">
		<Header slot="header">
			<h2 slot="title" class="text-2xl font-semibold">Email Sent successfully</h2>
			<h3 slot="subheading">An E-Mail has been sent to your address</h3>
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center p-6 text-center">
			<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
				<!-- Stable blue circle -->
				<circle cx="50" cy="50" r="45" fill="none" stroke="#007bff" stroke-width="5" />

				<!-- Envelope Body (the lower rectangle of the envelope) -->
				<path
					d="M30 40 L30 60 L70 60 L70 40"
					fill="none"
					stroke="#007bff"
					stroke-width="5"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset="100"
				>
					<animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.5s" fill="freeze" />
				</path>

				<!-- Envelope Flap (the triangular top of the envelope) -->
				<path
					d="M30 40 L50 25 L70 40"
					fill="none"
					stroke="#007bff"
					stroke-width="5"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset="100"
				>
					<animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.5s" fill="freeze" />
				</path>

				<!-- Arrow Shaft (rising from the envelope to indicate sending) -->
				<path
					d="M50 40 L50 15"
					fill="none"
					stroke="#007bff"
					stroke-width="5"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset="100"
				>
					<!-- Begins after the envelope is drawn -->
					<animate
						attributeName="stroke-dashoffset"
						from="100"
						to="0"
						begin="0.6s"
						dur="0.5s"
						fill="freeze"
					/>
				</path>

				<!-- Arrow Head Left -->
				<path
					d="M50 15 L45 20"
					fill="none"
					stroke="#007bff"
					stroke-width="5"
					stroke-linecap="round"
					pathLength="50"
					stroke-dasharray="50"
					stroke-dashoffset="50"
				>
					<animate
						attributeName="stroke-dashoffset"
						from="50"
						to="0"
						begin="1.1s"
						dur="0.3s"
						fill="freeze"
					/>
				</path>

				<!-- Arrow Head Right -->
				<path
					d="M50 15 L55 20"
					fill="none"
					stroke="#007bff"
					stroke-width="5"
					stroke-linecap="round"
					pathLength="50"
					stroke-dasharray="50"
					stroke-dashoffset="50"
				>
					<animate
						attributeName="stroke-dashoffset"
						from="50"
						to="0"
						begin="1.1s"
						dur="0.3s"
						fill="freeze"
					/>
				</path>
			</svg>

			<div class="mt-6 space-y-4">
				<p class="text-lg font-medium">Check your email</p>
				<p class="text-sm text-surface-content/70">
					We've sent you a verification link to your email address. Please check your inbox and
					click the link to continue.
				</p>
				<p class="text-xs text-surface-content/50">
					If you don't see the email, check your spam folder.
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
