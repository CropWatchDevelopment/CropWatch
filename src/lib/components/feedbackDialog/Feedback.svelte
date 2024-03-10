<script lang="ts">
	import { Button, Dialog, MenuItem, TextField } from "svelte-ux";
    let openFeedback: boolean = false;
</script>
<MenuItem on:click={() => (openFeedback = true)}>Give Feedback</MenuItem>
<Dialog open={openFeedback} persistent>
	<div slot="title">Have Feedback?</div>
    <div class="flex flex-row gap-2 mb-2 p-4">
        <Button variant="outline">😭</Button>
        <Button variant="outline">😢</Button>
        <Button variant="outline">😞</Button>
        <Button variant="outline">🫤</Button>
        <Button variant="outline">😊</Button>
        <Button variant="outline">😀</Button>
        <Button variant="outline">😁</Button>
    </div>
    <TextField label="Comment" multiline classes={{root: 'p-4'}} />
	<div slot="actions">
		<Button variant="fill" color="primary">Close</Button>
        <Button variant="fill" color="primary">Submit Feedback</Button>
	</div>
</Dialog>
