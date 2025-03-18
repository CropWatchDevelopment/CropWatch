import Highcharts from 'highcharts';

export interface TemperatureHumidityChartConfigInterface extends Highcharts.Options {
  chart: {
    type: 'line';
    backgroundColor: string;
  };
  title: {
    text: string;
    style: {
      color: string;
    };
  };
  legend: {
    enabled: boolean;
  };
  xAxis: {
    type: 'datetime';
    labels: {
      style: {
        color: string;
      };
      format: string;
      rotation: number;
    };
    title: {
      text: string;
    };
  };
  yAxis: [
    {
      title: {
        text: string;
      };
      labels: {
        format: string;
        style: {
          color: string;
        };
      };
    },
    {
      title: {
        text: string;
      };
      max: number;
      min: number;
      labels: {
        format: string;
        style: {
          color: string;
        };
      };
      opposite: boolean;
    }
  ];
  series: {
    type: 'spline';
    name: string;
    data: any[];
    tooltip: {
      valueSuffix: string;
    };
    lineWidth: number;
    color: string;
    yAxis?: number;
  }[];
}

export const TemperatureHumidityChartConfig: TemperatureHumidityChartConfigInterface = {
  chart: {
    type: 'line',
    backgroundColor: 'transparent'
  },
  title: {
    text: '24 Hour Temperature and Humidity',
    style: {
      color: 'white'
    }
  },
  legend: {
    enabled: false
  },
  xAxis: {
    type: 'datetime',
    labels: {
      style: {
        color: 'white'
      },
      format: '{value:%m/%d %H:%M}',
      rotation: 45
    },
    title: {
      text: ''
    }
  },
  yAxis: [
    {
      title: {
        text: ''
      },
      labels: {
        format: '{value}°C',
        style: {
          color: 'red'
        }
      }
    },
    {
      title: {
        text: ''
      },
      max: 100,
      min: 0,
      labels: {
        format: '{value}%',
        style: {
          color: 'aqua'
        }
      },
      opposite: true
    }
  ],
  series: [
    {
      type: 'spline',
      name: 'Temperature',
      data: [],
      tooltip: {
        valueSuffix: ' °C'
      },
      lineWidth: 1,
      color: 'red'
    },
    {
      type: 'spline',
      name: 'Humidity',
      data: [],
      color: 'aqua',
      yAxis: 1,
      tooltip: {
        valueSuffix: ' %'
      },
      lineWidth: 1
    }
  ]
};
