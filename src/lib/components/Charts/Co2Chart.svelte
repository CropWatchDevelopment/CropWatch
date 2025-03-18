<script lang="ts">
    import Highcharts from 'highcharts';
    import Chart from '@highcharts/svelte';
    import type { IDevice } from '$lib/interfaces/IDevice.interface';
    
    export let device: IDevice;
    
    const co2ChartConfig: Highcharts.Options = {
      chart: { type: 'spline', backgroundColor: 'transparent' },
      title: { text: 'CO₂ Levels Over Time' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'CO₂ (ppm)' } },
      series: [
        {
          type: 'spline',
          name: 'CO₂',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.co2]) || [],
          tooltip: { valueSuffix: ' ppm' },
          color: 'green'
        }
      ]
    };
    </script>
    
    <Chart options={co2ChartConfig} highcharts={Highcharts} />
    