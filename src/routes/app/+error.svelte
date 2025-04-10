<script>
    import { page } from '$app/stores';
    import { Card, Button, Icon } from 'svelte-ux';
    import { mdiAlertCircleOutline, mdiArrowLeft } from '@mdi/js';
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <Card class="flex w-full max-w-md flex-col items-center p-8 shadow-lg">
        <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-500">
            <Icon path={mdiAlertCircleOutline} size="3rem" />
        </div>
        
        <h1 class="mb-2 text-center text-2xl font-bold text-gray-800">An error occurred</h1>
        
        <p class="mb-6 text-center text-gray-600">
            {$page.error?.message || 'Something went wrong while loading this page.'}
        </p>

        <!-- {#if $page.error?.stack && import.meta.env.DEV}
            <pre class="mb-6 max-h-40 w-full overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-800">
                {$page.error.stack}
            </pre>
        {/if} -->
        
        <Button 
            variant="fill" 
            color="primary" 
            class="mt-2" 
            icon={mdiArrowLeft}
            href="/app/dashboard"
        >
            Go back to dashboard
        </Button>
    </Card>
</div>