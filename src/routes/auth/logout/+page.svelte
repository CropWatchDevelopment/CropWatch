<script>
	import { browser } from '$app/environment';
    import { goto } from '$app/navigation';

    fetch('/auth/logout?/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logout: true })
    }).then(() => {
        browser ?? localStorage.clear();
        goto('/auth/login');
    });
</script>



<h1>You have been Logged out, redirecting back to login page.</h1>