<script lang="ts">
  import { success, error as errorToast } from '$lib/stores/toast.svelte';

  let { data } = $props();
  let reports: any[] = data.reports;

  async function updateReport(report: any) {
    const formData = new FormData();
    formData.append('id', String(report.id));
    formData.append('name', report.name);
    const res = await fetch('?/updateReport', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      success('Report updated');
    } else {
      errorToast(result.error || 'Failed to update');
    }
  }

  async function deleteReport(id: number) {
    const formData = new FormData();
    formData.append('id', String(id));
    const res = await fetch('?/deleteReport', { method: 'POST', body: formData });
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
  <h1 class="text-xl font-semibold">Your Reports</h1>
  <a href="/app/all-reports/reports/create" class="underline text-primary">Create New Report</a>

  {#if reports.length === 0}
    <p>No reports found.</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each reports as report (report.id)}
        <li class="border rounded p-2 flex items-center gap-2">
          <input class="flex-1 border p-1 rounded" bind:value={report.name} />
          <button class="btn" on:click={() => updateReport(report)}>Save</button>
          <button class="btn" on:click={() => deleteReport(report.id)}>Delete</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
