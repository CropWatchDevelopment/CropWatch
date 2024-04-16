// src/routes/login/+page.svelte
<script>
    import { enhance } from '$app/forms';
    export let form;
</script>

<h2>Log in</h2>
<form action="?/login" method="POST" use:enhance>
    <label for="email">email</label>
    <input name="email" type="email" value={form?.email ?? ''} required />
    <label for="password">password</label>
    <input name="password" required />
    <button type="submit">Login</button>
</form>
{#if form?.invalid}<mark>{form?.message}!</mark>{/if}

<p>Forgot your password? <a href="/reset_password">Reset password</a></p>