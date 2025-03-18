<script lang="ts">
    import Highcharts from 'highcharts';
    import Chart from '@highcharts/svelte';
    import type { IDevice } from '$lib/interfaces/IDevice.interface';
    
    export let device: IDevice;
    
    const pressureChartConfig: Highcharts.Options = {
      chart: { type: 'spline', backgroundColor: 'transparent' },
      title: { text: 'Air Pressure Over Time' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'Pressure (hPa)' } },
      series: [
        {
          type: 'spline',
          name: 'Pressure',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.pressure]) || [],
          tooltip: { valueSuffix: ' hPa' },
          color: 'purple'
        }
      ]
    };
    </script>
    
    <Chart options={pressureChartConfig} highcharts={Highcharts} />
    