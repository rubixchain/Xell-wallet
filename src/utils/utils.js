
export function getTimeAgo(timestamp) {
    // Convert to milliseconds if timestamp is in seconds
    const timeMs = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;

    // Get current timestamp in milliseconds
    const currentTime = Date.now();

    // Calculate difference in seconds
    const diff = Math.floor((currentTime - timeMs) / 1000);

    // Define time intervals in seconds
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hr', seconds: 3600 },
        { label: 'min', seconds: 60 }
    ];

    // Handle cases less than a minute
    if (diff < 60) {
        return 'just now';
    }

    // Find the appropriate time interval
    for (const interval of intervals) {
        const count = Math.floor(diff / interval.seconds);

        if (count > 0) {
            // Handle plural forms
            if (count === 1) {
                return `1 ${interval.label} ago`;
            }
            // Special case for month/months
            if (interval.label === 'month') {
                return `${count} months ago`;
            }
            // For other units, just add 's'
            return `${count} ${interval.label}s ago`;
        }
    }

    return 'just now'; // fallback case
}

// Helper function to get timestamp for testing
export function getTestTimestamp(unitsAgo, unit) {
    const units = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
        years: 365 * 24 * 60 * 60 * 1000
    };

    return Date.now() - (unitsAgo * units[unit]);
}


export function sliceString(str, charsToShow = 3) {
    // Handle edge cases
    if (!str) return '';
    if (str.length <= charsToShow * 2) return str;

    const start = str.slice(0, charsToShow);
    const end = str.slice(-charsToShow);

    return `${start}...${end}`;
}

// Utility function to normalize Epoch timestamps
export function normalizeEpoch(epoch, dateTime) {
    let epochValue = epoch;
    
    if (epochValue && epochValue > 0) {
        // If Epoch is in seconds (10 digits), convert to milliseconds
        epochValue = epochValue.toString().length === 10 ? epochValue * 1000 : epochValue;
    } else if (dateTime) {
        // Fallback to DateTime if Epoch is not available
        epochValue = new Date(dateTime).getTime();
    } else {
        // If neither is available, use current time
        epochValue = Date.now();
    }
    
    return epochValue;
}