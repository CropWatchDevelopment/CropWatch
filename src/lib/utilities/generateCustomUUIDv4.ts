export function generateCustomUUIDv4() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0'); // Day in 2 digits
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month in 2 digits (getMonth() is 0-based)
    const year = String(now.getFullYear()).slice(2, 4); // Last 2 digits of year

    const datePart = `${day}${month}${year}`; // Concatenate day, month, and year

    // Generate the rest of the UUIDv4
    const uuidPart = 'xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    // Combine the date part with the generated UUID part
    return `${datePart}-${uuidPart}`;
}

console.log(generateCustomUUIDv4());