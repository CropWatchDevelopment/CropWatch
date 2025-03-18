export interface CO2ChartConfigInterface {
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
    yAxis: Array<{
      title: {
        text: string;
      };
      labels: {
        format: string;
        style: {
          color: string;
        };
      };
    }>;
    series: Array<{
      type: 'spline';
      name: string;
      data: any[];
      tooltip: {
        valueSuffix: string;
      };
      lineWidth: number;
      color: string;
    }>;
  }
  

export const CO2ChartConfig: CO2ChartConfigInterface = {
    chart: {
        type: 'line',
        backgroundColor: 'transparent'
    },
    title: {
        text: '24 Hour CO²',
        style: {
            color: 'white'
        }
    },
    legend: {
        enabled: false,
    },
    xAxis: {
        type: 'datetime', // Use datetime type for the x-axis
        labels: {
            style: {
                color: 'white'
            },
            format: '{value:%m/%d %H:%M}',
            rotation: 45
        },
        title: {
            text: '',
        }
    },
    yAxis: [
        {
            title: {
                text: ''
            },
            labels: {
                format: '{value}ppm',
                style: {
                    color: 'white'
                }
            }
        },
    ],
    series: [
        {
            type: 'spline',
            name: 'CO2',
            data: [],
            tooltip: {
                valueSuffix: ' °C'
            },
            lineWidth: 1,
            color: 'green'
        },
    ]
};