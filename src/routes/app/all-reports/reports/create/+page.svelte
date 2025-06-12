<script lang="ts">
  import { success, error as errorToast } from '$lib/stores/toast.svelte';

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const res = await fetch('?/createReport', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      success('Report created');
      form.reset();
    } else {
      errorToast(result.error || 'Failed to create report');
    }
  }
</script>

<div class="p-4 flex flex-col gap-4">
  <h1 class="text-xl font-semibold">Create Report</h1>
  <form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-2">
    <label>
      Name
      <input name="name" class="border p-1 rounded" required />
    </label>
    <label>
      Values (comma separated)
      <input name="values" class="border p-1 rounded" />
    </label>
    <label>
      Colors (comma separated)
      <input name="colors" class="border p-1 rounded" />
    </label>
    <label>
      Compression Interval (minutes)
      <input name="interval" type="number" class="border p-1 rounded" />
    </label>
    <label class="flex gap-2">
      <input type="checkbox" name="averaged" /> Average values
    </label>
    <label class="flex gap-2">
      <input type="checkbox" name="weekly" /> Send weekly
    </label>
    <label class="flex gap-2">
      <input type="checkbox" name="monthly" /> Send monthly
    </label>
    <label>
      Recipients (comma separated emails)
      <input name="recipients" class="border p-1 rounded" />
    </label>
    <button class="btn" type="submit">Create</button>
  </form>
</div>
