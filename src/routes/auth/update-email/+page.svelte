// src/routes/update_email/+page.svelte
<script>
    import { enhance } from '$app/forms';
    export let form
</script>

<h2>Change your email</h2>
<form action="?/update_email" method="POST" use:enhance>
    <label for="email"> new email </label>
    <input type="email" name="email" required />
    <button>Change email</button>
</form>
{#if form?.invalid}<mark>{form?.message}!</mark>{/if}