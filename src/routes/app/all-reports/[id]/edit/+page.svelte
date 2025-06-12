<script lang="ts">
  import { success, error } from '$lib/stores/toast.svelte';
  let { data } = $props();
  let report = data.report;
  let template = report.template || {};
  let points = $state(template.alertPoints || []);
  let interval = $state(template.interval ?? 60);
  let averaged = $state(template.averaged ?? false);
  let weekly = $state(template.weekly ?? false);
  let monthly = $state(template.monthly ?? false);

  function addPoint() {
    points.push({ name: '', min: null, max: null, color: '#000000' });
  }
  function removePoint(i: number) { points.splice(i,1); }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    template.alertPoints = points;
    template.interval = interval;
    template.averaged = averaged;
    template.weekly = weekly;
    template.monthly = monthly;
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    formData.set('template', JSON.stringify(template));
    const res = await fetch('?/update', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) {
      success('Report updated');
    } else {
      error('Failed to update');
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="p-4 flex flex-col gap-2">
  <label>Name <input name="name" bind:value={report.name} class="border p-1 rounded" /></label>
  {#each points as p, i}
    <div class="flex items-center gap-2">
      <input type="text" bind:value={p.name} placeholder="Name" class="border p-1 rounded" />
      <input type="number" bind:value={p.min} placeholder="Min" class="w-20 border p-1 rounded" />
      <input type="number" bind:value={p.max} placeholder="Max" class="w-20 border p-1 rounded" />
      <input type="color" bind:value={p.color} />
      <button type="button" class="text-red-600" on:click={() => removePoint(i)}>X</button>
    </div>
  {/each}
  <button type="button" on:click={addPoint} class="underline">Add Point</button>
  <label>Interval (minutes)
    <input type="number" bind:value={interval} class="border p-1 rounded" />
  </label>
  <label class="flex gap-2"><input type="checkbox" bind:checked={averaged} /> Average values</label>
  <label class="flex gap-2"><input type="checkbox" bind:checked={weekly} /> Send weekly</label>
  <label class="flex gap-2"><input type="checkbox" bind:checked={monthly} /> Send monthly</label>
  <button type="submit" class="btn mt-2">Save</button>
</form>
