<script lang="ts">
    import Highcharts from 'highcharts';
    import Chart from '@highcharts/svelte';
    import type { IDevice } from '$lib/interfaces/IDevice.interface';
    
    export let device: IDevice;
    
    const temperatureHumidityConfig: Highcharts.Options = {
      chart: { type: 'spline', backgroundColor: 'transparent' },
      title: { text: 'Temperature & Humidity Over Time' },
      xAxis: { type: 'datetime' },
      yAxis: [
        { title: { text: 'Temperature (°C)' } },
        { title: { text: 'Humidity (%)' }, opposite: true }
      ],
      series: [
        {
          type: 'spline',
          name: 'Temperature',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.temperature_c]) || [],
          tooltip: { valueSuffix: ' °C' },
          color: 'red'
        },
        {
          type: 'spline',
          name: 'Humidity',
          data: device.all_data?.map(d => [new Date(d.created_at).getTime(), d.humidity]) || [],
          tooltip: { valueSuffix: ' %' },
          color: 'blue',
          yAxis: 1
        }
      ]
    };
    </script>
    
    <Chart options={temperatureHumidityConfig} highcharts={Highcharts} />
    