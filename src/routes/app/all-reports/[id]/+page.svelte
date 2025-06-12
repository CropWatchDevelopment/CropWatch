<script lang="ts">
  let { data } = $props();
  const report = data.report;
</script>

<div class="p-4 flex flex-col gap-4">
  <h1 class="text-xl font-semibold">{report.name}</h1>
  <pre class="bg-muted rounded p-2 text-sm">{JSON.stringify(report.template, null, 2)}</pre>
  <a class="text-primary underline" href="./edit">Edit</a>
</div>
