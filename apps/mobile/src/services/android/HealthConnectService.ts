// Android Health Connect Service
// Wrapper for react-native-health-connect

import {
    initialize,
    requestPermission,
    readRecords,
    SdkAvailabilityStatus,
    getSdkStatus,
} from 'react-native-health-connect';

/**
 * Check if Health Connect is available
 */
export async function isAvailable(): Promise<boolean> {
    try {
        const status = await getSdkStatus();
        return status === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (error) {
        console.log('Health Connect not available:', error);
        return false;
    }
}

/**
 * Request Health Connect permissions
 */
export async function requestPermissions(): Promise<boolean> {
    try {
        // Initialize Health Connect
        const isInitialized = await initialize();
        if (!isInitialized) {
            console.log('Failed to initialize Health Connect');
            return false;
        }

        // Request permissions
        const permissions = [
            { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
            { accessType: 'read' as const, recordType: 'TotalCaloriesBurned' as const },
        ];

        await requestPermission(permissions);
        return true;
    } catch (error) {
        console.log('Health Connect permission error:', error);
        return false;
    }
}

/**
 * Fetch total calories for a specific date
 */
export async function fetchCalories(date: string): Promise<number> {
    try {
        const targetDate = new Date(date);

        // Set start and end of day
        const startTime = new Date(targetDate);
        startTime.setHours(0, 0, 0, 0);

        const endTime = new Date(targetDate);
        endTime.setHours(23, 59, 59, 999);

        let totalCalories = 0;

        // Try to read TotalCaloriesBurned first
        try {
            const result = await readRecords('TotalCaloriesBurned', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                },
            });

            const records = result as any;
            if (Array.isArray(records)) {
                totalCalories = records.reduce((sum: number, record: any) => {
                    return sum + (record.energy?.inKilocalories || 0);
                }, 0);
            }
        } catch (error) {
            console.log('Could not read TotalCaloriesBurned:', error);
        }

        // If no total calories, try active calories
        if (totalCalories === 0) {
            try {
                const result = await readRecords('ActiveCaloriesBurned', {
                    timeRangeFilter: {
                        operator: 'between',
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                    },
                });

                const records = result as any;
                if (Array.isArray(records)) {
                    totalCalories = records.reduce((sum: number, record: any) => {
                        return sum + (record.energy?.inKilocalories || 0);
                    }, 0);
                }
            } catch (error) {
                console.log('Could not read ActiveCaloriesBurned:', error);
            }
        }

        return totalCalories;
    } catch (error) {
        console.error('Error fetching calories from Health Connect:', error);
        return 0;
    }
}

/**
 * Get calories for a date range
 */
export async function fetchCaloriesRange(
    startDate: string,
    endDate: string
): Promise<{ date: string; calories: number }[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: { date: string; calories: number }[] = [];

    // Iterate through each day
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const calories = await fetchCalories(dateStr);
        results.push({ date: dateStr, calories });
    }

    return results;
}
