<script lang="ts">
	import { Avatar, Button, Card, Header } from 'svelte-ux';
	import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';
	import { mdiArrowLeft, mdiCheck } from '@mdi/js';
</script>

<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
	<Card class="mx-auto w-full max-w-[480px] px-3 py-6 pb-6 shadow sm:rounded-lg sm:px-12">
		<Header slot="header">
			<h2 slot="title" class="text-2xl font-semibold">Resource Unauthorized</h2>
			<!-- <h3 slot="subheading">You do not have access to this resource, or your login has expired.</h3> -->
			<div slot="avatar">
				<Avatar class="font-bold text-primary-content">
					<img src={LOGO_IMAGE} alt="CropWatch LLC" />
				</Avatar>
			</div>
		</Header>
		<div class="flex w-full flex-col items-center justify-center p-6 text-center">
			<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <!-- Red circle -->
                <circle cx="50" cy="50" r="45" fill="none" stroke="#d32f2f" stroke-width="5" />
            
                <!-- Lock Body -->
                <rect x="35" y="50" width="30" height="30" fill="#d32f2f" stroke="none" rx="5" ry="5"/>
            
                <!-- Lock Shackle - Starts Open and Closes -->
                <path d="M40 50 v-15 a10 10 0 0 1 20 0 v15" fill="none" stroke="#d32f2f" stroke-width="5" stroke-linecap="round">
                    <animate attributeName="d" from="M40 50 v-15 a10 10 0 0 1 20 0 v5" to="M40 50 v-15 a10 10 0 0 1 20 0 v15" dur="0.5s" fill="freeze"/>
                </path>
            
                <!-- Keyhole -->
                <circle cx="50" cy="65" r="3" fill="black"/>
                <rect x="48.5" y="68" width="3" height="7" fill="black" rx="1.5" ry="1.5"/>
            </svg>
            
            
            

			<div class="mt-6 space-y-4">
				<p class="text-lg font-medium">You do not have access to this</p>
				<p class="text-sm text-surface-content/70">
					Your login session may have expired, or you do not have access to this resource. Please re-login and try again,
                    or contact your administrator for assistance.
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
