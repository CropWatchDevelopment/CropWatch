<script lang="ts">
	import { closeFeedback } from '$lib/stores/feedback.store';
    import { Button, Dialog, MenuItem, TextField } from 'svelte-ux';
    let openFeedback: boolean = false;
</script>

<Dialog open={openFeedback} persistent>
    <div slot="title">Have Feedback? {openFeedback}</div>
    <div class="flex flex-row gap-2 mb-2 p-4">
        <Button variant="outline">😭</Button>
        <Button variant="outline">😢</Button>
        <Button variant="outline">😞</Button>
        <Button variant="outline">🫤</Button>
        <Button variant="outline">😊</Button>
        <Button variant="outline">😀</Button>
        <Button variant="outline">😁</Button>
    </div>
    <TextField label="Comment" multiline classes={{ root: 'p-4' }} />
    <div slot="actions">
        <Button variant="fill" color="primary" on:click={() => (closeFeedback())}>Close</Button>
        <Button variant="fill" color="primary">Submit Feedback</Button>
    </div>
</Dialog>
