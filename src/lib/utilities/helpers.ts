// Helper function to format date for input fields
export function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper function to format date for display
export function formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    
    // Format: 17 May 2025, 11:10
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(',', '').replace(/\s+/g, ' ');
}

// Helper function to format date only (no time) in a consistent format
export function formatDateOnly(dateStr: string): string {
    const date = new Date(dateStr);
    
    // Format as "17 May 2025"
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).replace(',', '');
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