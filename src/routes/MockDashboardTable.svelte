<script lang="ts">
	interface Props {
		filters: {
			group: string;
			locationGroup: string;
			location: string;
		};
	}

	let { filters }: Props = $props();
</script>

<div data-testid="dashboard-table-stub">{JSON.stringify(filters)}</div>
