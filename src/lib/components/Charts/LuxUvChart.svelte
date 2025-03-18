<script lang="ts">
    import Highcharts from 'highcharts';
    import Chart from '@highcharts/svelte';
    import type { IDevice } from '$lib/interfaces/IDevice.interface';
    
    export let device: IDevice;
    
    const luxUvChartConfig: Highcharts.Options = {
      chart: { type: 'spline', backgroundColor: 'transparent' },
      title: { text: 'Light & UV Index Over Time' },
      xAxis: { type: 'datetime' },
      yAxis: [
        { title: { text: 'Light (lux)' } },
        { title: { text: 'UV Index' }, opposite: true }
      ],
      series: [
        {
          type: 'spline',
          name: 'Light',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.lux]) || [],
          tooltip: { valueSuffix: ' lux' },
          color: 'yellow'
        },
        {
          type: 'spline',
          name: 'UV Index',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.uv_index]) || [],
          tooltip: { valueSuffix: '' },
          color: 'orange',
          yAxis: 1
        }
      ]
    };
    </script>
    
    <Chart options={luxUvChartConfig} highcharts={Highcharts} />
    