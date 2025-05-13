// Helper function to format date for input fields
export function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper function to format date for display
export function formatDateForDisplay(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
}

// Helper function to calculate average
export function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(2));
}

// Helper function to determine if a property exists and has a value
export function hasValue(obj: any, prop: string): boolean {
    return obj && prop in obj && obj[prop] !== null;
}