<script lang="ts">
	import { enhance } from '$app/forms';
	import { json } from '@sveltejs/kit';
	import { toast } from '@zerodevx/svelte-toast';
	export let form;
</script>

// src/routes/login/+page.svelte
<h2>Log in</h2>
<form
	action="?/login"
	method="POST"
	use:enhance={({ formElement, formData, action, cancel, submitter }) => {
		// `formElement` is this `<form>` element
		// `formData` is its `FormData` object that's about to be submitted
		// `action` is the URL to which the form is posted
		// calling `cancel()` will prevent the submission
		// `submitter` is the `HTMLElement` that caused the form to be submitted

		return async ({ result, update }) => {
			if (result.status && result.status < 400) {
				update();
				toast.push('Login successful!', {
					theme: {
						'--toastBackground': 'cyan',
						'--toastColor': 'black'
					}
				});
			} else {
				console.log(await result);
				toast.push(form?.message ?? 'Login Error', {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		};
	}}
>
	<label for="email">email</label>
	<input name="email" type="email" value={form?.email ?? ''} required />
	<label for="password">password</label>
	<input name="password" required />
	<button type="submit">Login</button>
</form>
{#if form?.invalid}<mark>{form?.message}!</mark>{/if}

<p>Forgot your password? <a href="/auth/reset-password">Reset password</a></p>