<script lang="ts">
	import highcharts from '$lib/components/charts/highcharts/highcharts-action';
	export let N: number = 0;
	export let P: number = 0;
	export let K: number = 0;
	// export let EC: number = 0;
	// export let PH: number = 0;
	export let label: string = '';

	const config = {
		chart: {
			polar: true,
			type: 'line'
		},

		title: {
			text: label,
			x: -80
		},

		pane: {
			size: '80%'
		},

		xAxis: {
			categories: ['N', 'K', 'P'],
			tickmarkPlacement: 'on',
			lineWidth: 0
		},

		yAxis: {
			gridLineInterpolation: 'polygon',
			lineWidth: 0,
			min: 0
		},

		tooltip: {
			shared: true,
			pointFormat: '<span style="color:{series.color}">{series.name}: <b>{point.y:,.0f}</b><br/>'
		},

		series: [
			{
				name: 'Current Values',
				data: [N, K, P],
				pointPlacement: 'on'
			}
		],

		responsive: {
			rules: [
				{
					condition: {
						maxWidth: 500
					},
					chartOptions: {
						legend: {
							align: 'center',
							verticalAlign: 'bottom',
							layout: 'horizontal'
						},
						pane: {
							size: '70%'
						}
					}
				}
			]
		}
	};
</script>

<div class="container" use:highcharts={config} />

<style>
	.highcharts-figure,
	.highcharts-data-table table {
		min-width: 320px;
		max-width: 700px;
		margin: 1em auto;
	}

	.highcharts-data-table table {
		font-family: Verdana, sans-serif;
		border-collapse: collapse;
		border: 1px solid #ebebeb;
		margin: 10px auto;
		text-align: center;
		width: 100%;
		max-width: 500px;
	}

	.highcharts-data-table caption {
		padding: 1em 0;
		font-size: 1.2em;
		color: #555;
	}

	.highcharts-data-table th {
		font-weight: 600;
		padding: 0.5em;
	}

	.highcharts-data-table td,
	.highcharts-data-table th,
	.highcharts-data-table caption {
		padding: 0.5em;
	}

	.highcharts-data-table thead tr,
	.highcharts-data-table tr:nth-child(even) {
		background: #f8f8f8;
	}

	.highcharts-data-table tr:hover {
		background: #f1f7ff;
	}
</style>
