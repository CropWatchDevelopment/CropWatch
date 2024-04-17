// src/routes/reset_password/+page.svelte
<script>
    import { enhance } from '$app/forms';
    export let form
</script>

<h2>Where should we send you a link for password reset?</h2>
<form action="?/reset_password" method="POST" use:enhance>
    <label for="email">email</label>
    <input type="email" name="email" placeholder="name@domain.com" required />
    <button type="submit">Get password</button>
</form>
{#if form?.invalid}<mark>{form?.message}!</mark>{/if}