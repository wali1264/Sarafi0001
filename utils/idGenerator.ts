
export const formatTrackingCode = (dateInput: Date | string): string => {
    if (!dateInput) return '---';
    const timestamp = new Date(dateInput).getTime();
    if (isNaN(timestamp)) return '---';
    // Use last 8 digits of timestamp. 
    // Example: 1732686054321 -> 86054321
    return timestamp.toString().slice(-8);
};
