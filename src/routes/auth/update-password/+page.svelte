// src/routes/update_password/+page.svelte
<script lang="ts">
    import { enhance } from '$app/forms';
    export let form;
</script>

<h2>Change your password</h2>
{#if form?.invalid}<mark>{form?.message}!</mark>{/if}
<form action="?/update-password" method="POST" use:enhance>
    <label for="new_password"> New password </label>
    <input name="new_password" required/>   
    <label for="password_confirm">Confirm new password</label>
    <input name="password_confirm" required/>       
    <button>Update password</button>
</form>