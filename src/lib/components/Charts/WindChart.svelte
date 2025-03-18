<script lang="ts">
    import Highcharts from 'highcharts';
    import Chart from '@highcharts/svelte';
    import type { IDevice } from '$lib/interfaces/IDevice.interface';
    
    export let device: IDevice;
    
    const windChartConfig: Highcharts.Options = {
      chart: { type: 'spline', backgroundColor: 'transparent' },
      title: { text: 'Wind Speed Over Time' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'Wind Speed (m/s)' } },
      series: [
        {
          type: 'spline',
          name: 'Wind Speed',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.wind_speed]) || [],
          tooltip: { valueSuffix: ' m/s' },
          color: 'blue'
        }
      ]
    };
    </script>
    
    <Chart options={windChartConfig} highcharts={Highcharts} />
    