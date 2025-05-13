import { browser } from '$app/environment';
import type { DeviceWithType } from '$lib/models/Device';
import { calculateAverage, formatDateForDisplay, formatDateForInput, hasValue } from '$lib/utilities/helpers';

export interface DeviceDetailProps {
    user: any;
    device: DeviceWithType;
    dataType: string;
    latestData: any;
    historicalData: any[];
}

export function setupDeviceDetail() {
    // Stats for the data
    const stats = $state({
        temperature: { min: 0, max: 0, avg: 0 },
        humidity: { min: 0, max: 0, avg: 0 },
        moisture: { min: 0, max: 0, avg: 0 },
        co2: { min: 0, max: 0, avg: 0 },
        ph: { min: 0, max: 0, avg: 0 }
    });

    // Chart data
    const chartData = $state({
        labels: [] as string[],
        temperature: [] as number[],
        humidity: [] as number[],
        moisture: [] as number[],
        co2: [] as number[],
        ph: [] as number[]
    });

    // States for the component
    let loading = $state(false);
    let error: string | null = $state(null);

    // Date range selection
    let startDate: string = $state('');
    let endDate: string = $state('');

    // Libraries and elements
    let ApexCharts: any = $state();
    let ApexGrid: any = $state();
    
    // ApexGrid instance
    let grid: any = $state();

    

    // Function to process historical data and calculate stats
    function processHistoricalData(historicalData: any[], dataType: string) {
        if (!historicalData || historicalData.length === 0) return;

        // Extract timestamps for chart labels (most recent to oldest)
        chartData.labels = historicalData
            .map((data) => formatDateForDisplay(data.created_at))
            .reverse();

        // Reset chart data arrays
        chartData.temperature = [];
        chartData.humidity = [];
        chartData.moisture = [];
        chartData.co2 = [];
        chartData.ph = [];

        // Reset stats
        let tempValues: number[] = [];
        let humidityValues: number[] = [];
        let moistureValues: number[] = [];
        let co2Values: number[] = [];
        let phValues: number[] = [];

        // Process data points based on type (air or soil)
        historicalData.forEach((data) => {
            // Temperature (exists in both air and soil data)
            if ('temperature_c' in data && data.temperature_c !== null) {
                tempValues.push(data.temperature_c);
                chartData.temperature.unshift(data.temperature_c);
            }

            // Air data specific
            if (dataType === 'air') {
                // Humidity
                if ('humidity' in data && data.humidity !== null) {
                    humidityValues.push(data.humidity);
                    chartData.humidity.unshift(data.humidity);
                }

                // CO2
                if ('co2' in data && data.co2 !== null) {
                    co2Values.push(data.co2);
                    chartData.co2.unshift(data.co2);
                }
            }

            // Soil data specific
            else if (dataType === 'soil') {
                // Moisture
                if ('moisture' in data && data.moisture !== null) {
                    moistureValues.push(data.moisture);
                    chartData.moisture.unshift(data.moisture);
                }

                // pH
                if ('ph' in data && data.ph !== null) {
                    phValues.push(data.ph);
                    chartData.ph.unshift(data.ph);
                }
            }
        });

        // Calculate statistics for temperature
        if (tempValues.length > 0) {
            stats.temperature.min = Math.min(...tempValues);
            stats.temperature.max = Math.max(...tempValues);
            stats.temperature.avg = calculateAverage(tempValues);
        }

        // Calculate statistics for humidity
        if (humidityValues.length > 0) {
            stats.humidity.min = Math.min(...humidityValues);
            stats.humidity.max = Math.max(...humidityValues);
            stats.humidity.avg = calculateAverage(humidityValues);
        }

        // Calculate statistics for moisture
        if (moistureValues.length > 0) {
            stats.moisture.min = Math.min(...moistureValues);
            stats.moisture.max = Math.max(...moistureValues);
            stats.moisture.avg = calculateAverage(moistureValues);
        }

        // Calculate statistics for CO2
        if (co2Values.length > 0) {
            stats.co2.min = Math.min(...co2Values);
            stats.co2.max = Math.max(...co2Values);
            stats.co2.avg = calculateAverage(co2Values);
        }

        // Calculate statistics for pH
        if (phValues.length > 0) {
            stats.ph.min = Math.min(...phValues);
            stats.ph.max = Math.max(...phValues);
            stats.ph.avg = calculateAverage(phValues);
        }
    }

    // Function to fetch data for a specific date range
    async function fetchDataForDateRange(device: DeviceWithType) {
        if (!startDate || !endDate) {
            error = 'Please select both start and end dates';
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            error = 'Start date must be before end date';
            return;
        }

        loading = true;
        error = null;

        try {
            const response = await fetch(
                `/api/devices/${device.dev_eui}/data?start=${startDate}&end=${endDate}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const newHistoricalData = await response.json();
            return newHistoricalData;
        } catch (err) {
            error = err instanceof Error ? err.message : 'Unknown error occurred';
            return [];
        } finally {
            loading = false;
        }
    }

    // Function to setup and render the charts and grid
    async function renderVisualization(historicalData: any[], dataType: string, latestData: any) {
        if (!browser || !historicalData || historicalData.length === 0) return;
        
        // Access the DOM elements through the elements available in the main component
        const chart1Element = document.querySelector('.main-chart');
        const chart1BrushElement = document.querySelector('.brush-chart');
        const dataGridElement = document.querySelector('.data-grid');
        
        if (!chart1Element || !chart1BrushElement || !dataGridElement) {
            console.error("Chart DOM elements not found");
            return;
        }
        
        // Clear existing charts before redrawing
        if (chart1Element) chart1Element.innerHTML = '';
        if (chart1BrushElement) chart1BrushElement.innerHTML = '';
        if (dataGridElement) dataGridElement.innerHTML = '';
        
        // Import ApexCharts and ApexGrid
        ApexCharts = await import('apexcharts').then((module) => module.default);
        try {
            //ApexGrid = await import('apex-grid').then((module) => module.default);
        } catch (error) {
            console.error('Failed to load ApexGrid:', error);
        }
        
        // Filter out any data points that have null values
        const validData = historicalData.filter(data => 
            (dataType === 'air' ? 
                data.temperature_c !== null && data.humidity !== null : 
                data.temperature_c !== null && data.moisture !== null)
        );
        
        if (validData.length === 0) {
            console.warn("No valid data points with required values");
            return;
        }
        
        // Format temperature data for the chart
        const temperatureData = validData.map(data => ({
            x: new Date(data.created_at).getTime(),
            y: data.temperature_c
        }));
        
        // Format humidity/moisture data depending on device type
        const secondaryData = validData.map(data => ({
            x: new Date(data.created_at).getTime(), 
            y: dataType === 'air' ? data.humidity : data.moisture
        }));
        
        // Determine chart labels based on data type
        const mainLabel = 'Temperature (°C)';
        const secondaryLabel = dataType === 'air' ? 'Humidity (%)' : 'Moisture (%)';
        
        // Determine min and max dates for chart selection
        const dateValues = validData.map(d => new Date(d.created_at).getTime());
        const minDate = Math.min(...dateValues);
        const maxDate = Math.max(...dateValues);
        
        // Configure the main chart
        const mainChartOptions = {
            series: [{
                name: mainLabel,
                data: temperatureData.slice().sort((a, b) => a.x - b.x)
            }, {
                name: secondaryLabel,
                data: secondaryData.slice().sort((a, b) => a.x - b.x)
            }],
            chart: {
                id: 'mainChart',
                type: 'line',
                height: 350,
                toolbar: {
                    autoSelected: 'pan',
                    show: false
                },
                animations: {
                    enabled: false
                },
                zoom: {
                    enabled: false
                }
            },
            colors: ['#FF4560', '#00E396'],
            stroke: {
                curve: 'smooth',
                width: [3, 3]
            },
            dataLabels: {
                enabled: false
            },
            markers: {
                size: 3,
                strokeWidth: 0,
                hover: {
                    size: 7
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    datetimeUTC: false
                }
            },
            yaxis: [
                {
                    seriesName: mainLabel,
                    title: {
                        text: mainLabel,
                        style: {
                            color: '#FF4560'
                        }
                    },
                    labels: {
                        style: {
                            colors: '#FF4560'
                        }
                    }
                },
                {
                    seriesName: secondaryLabel,
                    opposite: true,
                    title: {
                        text: secondaryLabel,
                        style: {
                            color: '#00E396'
                        }
                    },
                    labels: {
                        style: {
                            colors: '#00E396'
                        }
                    }
                }
            ],
            tooltip: {
                shared: true,
                x: {
                    format: 'MMM dd HH:mm'
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center'
            },
            grid: {
                borderColor: '#e7e7e7',
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                }
            }
        };
        
        // Configure the brush chart
        const brushChartOptions = {
            series: [{
                name: mainLabel,
                data: temperatureData.slice().sort((a, b) => a.x - b.x)
            }, {
                name: secondaryLabel,
                data: secondaryData.slice().sort((a, b) => a.x - b.x)
            }],
            chart: {
                id: 'brushChart',
                height: 150,
                type: 'area',
                brush: {
                    target: 'mainChart',
                    enabled: true
                },
                selection: {
                    enabled: true,
                    xaxis: {
                        min: minDate,
                        max: maxDate
                    }
                },
            },
            colors: ['#FF4560', '#00E396'],
            fill: {
                type: 'gradient',
                gradient: {
                    opacityFrom: 0.7,
                    opacityTo: 0.3,
                }
            },
            stroke: {
                width: [1, 1]
            },
            xaxis: {
                type: 'datetime',
                tooltip: {
                    enabled: false
                },
                labels: {
                    datetimeUTC: false
                }
            },
            yaxis: {
                show: false,
                tickAmount: 2
            },
            legend: {
                show: false
            }
        };
        
        // Render the charts
        if (ApexCharts && chart1Element && chart1BrushElement) {
            const mainChart = new ApexCharts(chart1Element, mainChartOptions);
            const brushChart = new ApexCharts(chart1BrushElement, brushChartOptions);
            
            await mainChart.render();
            await brushChart.render();
        }

        // Build columns for the data grid based on data type
        const columns = [
            { 
                field: 'created_at', 
                name: 'Timestamp',
                type: 'datetime',
                width: '180px',
                formatter: (value: string) => formatDateForDisplay(value)
            },
            { 
                field: 'temperature_c', 
                name: 'Temperature (°C)',
                type: 'number',
                width: '130px',
                formatter: (value: number | null) => value !== null ? value : 'N/A'
            }
        ];

        // Add columns based on data type
        if (dataType === 'air') {
            columns.push({ 
                field: 'humidity', 
                name: 'Humidity (%)',
                type: 'number',
                width: '120px',
                formatter: (value: number | null) => value !== null ? value : 'N/A'
            });
            
            if (hasValue(latestData, 'co2')) {
                columns.push({ 
                    field: 'co2', 
                    name: 'CO2 (ppm)',
                    type: 'number',
                    width: '120px',
                    formatter: (value: number | null) => value !== null ? value : 'N/A'
                });
            }
        } else {
            columns.push({ 
                field: 'moisture', 
                name: 'Moisture (%)',
                type: 'number',
                width: '120px',
                formatter: (value: number | null) => value !== null ? value : 'N/A'
            });
            
            if (hasValue(latestData, 'ph')) {
                columns.push({ 
                    field: 'ph', 
                    name: 'pH Level',
                    type: 'number',
                    width: '100px',
                    formatter: (value: number | null) => value !== null ? value : 'N/A'
                });
            }
        }

        // Configure and render the data grid if element and library are available
        if (dataGridElement && ApexGrid) {
            const gridOptions = {
                columns: columns,
                data: historicalData,
                theme: 'light',
                pagination: {
                    enabled: true,
                    pageSize: 10,
                    pageSizes: [10, 25, 50, 100]
                },
                search: {
                    enabled: true,
                    placeholder: 'Search data...'
                },
                sorting: {
                    enabled: true,
                    multiColumn: false
                }
            };

            grid = new ApexGrid(dataGridElement, gridOptions);
            grid.render();
        }
    }

    // Initialize dates function
    function initializeDateRange() {
        // Set default date range (last 7 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        startDate = formatDateForInput(start);
        endDate = formatDateForInput(end);
    }

    return {
        // State
        stats,
        chartData,
        loading,
        error,
        startDate,
        endDate,
        
        // Element refs
        // Functions
        formatDateForDisplay,
        hasValue,
        processHistoricalData,
        fetchDataForDateRange,
        renderVisualization,
        initializeDateRange
    };
}

// Derived properties calculations
export function getDeviceDetailDerived(device: DeviceWithType, dataType: string, latestData: any) {
    // Determine device type name
    const deviceTypeName = device?.cw_device_type?.name || 'Unknown Type';

    // Reactive declarations for the charts
    const temperatureChartVisible = dataType === 'air' || dataType === 'soil';
    const humidityChartVisible = dataType === 'air';
    const moistureChartVisible = dataType === 'soil';
    const co2ChartVisible = dataType === 'air' && hasValue(latestData, 'co2');
    const phChartVisible = dataType === 'soil' && hasValue(latestData, 'ph');
    
    // Helper function to determine if a property exists and has a value
    function hasValue(obj: any, prop: string): boolean {
        return obj && prop in obj && obj[prop] !== null;
    }

    return {
        deviceTypeName,
        temperatureChartVisible,
        humidityChartVisible,
        moistureChartVisible,
        co2ChartVisible,
        phChartVisible
    };
}