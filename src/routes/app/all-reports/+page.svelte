<script lang="ts">
  import { success, error as errorToast } from '$lib/stores/toast.svelte';
  import { AlertDialog } from 'bits-ui';

  let { data } = $props();
  let reports = $state(data.reports as any[]);

  async function deleteReport(id: number) {
    const formData = new FormData();
    formData.append('id', String(id));
    const res = await fetch('?/delete', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      reports = reports.filter((r) => r.id !== id);
      success('Report deleted');
    } else {
      errorToast(result.error || 'Failed to delete');
    }
  }
</script>

<div class="p-4 flex flex-col gap-4">
  <h1 class="text-xl font-semibold">Reports</h1>
  <a href="/app/all-reports/reports/create" class="underline text-primary">Create New Report</a>

  {#if reports.length === 0}
    <p>No reports found.</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each reports as report (report.id)}
        <li class="border rounded p-2 flex items-center justify-between gap-2">
          <span>{report.name}</span>
          <div class="flex gap-2 items-center">
            <a class="underline text-primary" href={`/app/all-reports/${report.id}`}>View</a>
            <a class="underline text-primary" href={`/app/all-reports/${report.id}/edit`}>Edit</a>
            <AlertDialog.Root>
              <AlertDialog.Trigger class="underline text-red-600">Delete</AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay class="fixed inset-0 bg-black/50" />
                <AlertDialog.Content class="bg-background rounded p-4 shadow fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <AlertDialog.Title class="font-semibold">Delete {report.name}?</AlertDialog.Title>
                  <AlertDialog.Description class="text-sm">This action cannot be undone.</AlertDialog.Description>
                  <div class="mt-4 flex gap-2 justify-end">
                    <AlertDialog.Cancel class="px-3 py-1 border rounded">Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action onclick={() => deleteReport(report.id)} class="px-3 py-1 bg-red-600 text-white rounded">Delete</AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
