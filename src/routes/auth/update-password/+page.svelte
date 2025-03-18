<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { Avatar, Button, Card, Header, TextField } from 'svelte-ux';
    import { mdiLock } from '@mdi/js';
    import LOGO_IMAGE from '$lib/images/CropWatchLogo.svg';

    let { data } = $props();
    const { form, errors, enhance, message } = superForm(data.form, {
        onResult: ({ result }) => {
            // Handle successful password update
            if (result.type === 'success') {
                document.location.href = '/auth/password-update-success';
            } else {
                document.location.href = '/auth/password-update-failure';
            }
        },
    });
</script>

<div class="flex min-h-[calc(100vh-64px)] items-center justify-center">
    <Card class="w-full max-w-[480px] px-3 shadow sm:rounded-lg sm:px-12">
        <Header title="Set New Password" subheading="Please enter your new password" slot="header">
            <div slot="avatar">
                <Avatar class="font-bold text-primary-content">
                    <img src={LOGO_IMAGE} alt="CropWatch LLC" />
                </Avatar>
            </div>
        </Header>

        <div class="flex w-full flex-col items-center justify-center">
            <form method="POST" use:enhance class="w-full space-y-6">
                {#if $message}
                    <div class="rounded-md bg-primary/10 p-4">
                        <p class="text-sm text-primary">{$message}</p>
                    </div>
                {/if}

                <div>
                    <label for="password" class="block text-sm/6 font-medium">New Password</label>
                    <div class="mt-2">
                        <TextField
                            id="password"
                            type="password"
                            name="password"
                            icon={mdiLock}
                            autocomplete="new-password"
                            bind:value={$form.password}
                            error={$errors.password}
                            placeholder="Enter your new password"
                        />
                    </div>
                </div>

                <div>
                    <label for="confirmPassword" class="block text-sm/6 font-medium">Confirm Password</label>
                    <div class="mt-2">
                        <TextField
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            icon={mdiLock}
                            autocomplete="new-password"
                            bind:value={$form.confirmPassword}
                            error={$errors.confirmPassword}
                            placeholder="Confirm your new password"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    variant="fill"
                    color="primary"
                    class="w-full"
                    size="lg"
                >
                    Update Password
                </Button>
            </form>
        </div>
    </Card>
</div>