// iOS HealthKit Service
// Wrapper for react-native-health

import AppleHealthKit, {
    HealthValue,
    HealthKitPermissions,
} from 'react-native-health';

const permissions: HealthKitPermissions = {
    permissions: {
        read: [
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
        ],
        write: [],
    },
};

/**
 * Check if HealthKit is available
 */
export async function isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        AppleHealthKit.isAvailable((error: Object, available: boolean) => {
            if (error) {
                console.log('HealthKit not available:', error);
                resolve(false);
                return;
            }
            resolve(available);
        });
    });
}

/**
 * Request HealthKit permissions
 */
export async function requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
            if (error) {
                console.log('HealthKit permission error:', error);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}

/**
 * Fetch total calories for a specific date
 * Combines Active Energy + Basal Energy
 */
export async function fetchCalories(date: string): Promise<number> {
    const targetDate = new Date(date);

    // Set start and end of day
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };

    // Fetch Active Energy Burned
    const activeEnergy = await new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(
            options,
            (error: Object, results: HealthValue[]) => {
                if (error) {
                    console.log('Error fetching active energy:', error);
                    resolve(0);
                    return;
                }

                // Sum all active energy samples for the day
                const total = results.reduce((sum, sample) => {
                    return sum + (sample.value || 0);
                }, 0);

                resolve(total);
            }
        );
    });

    // Fetch Basal Energy Burned
    const basalEnergy = await new Promise<number>((resolve) => {
        AppleHealthKit.getBasalEnergyBurned(
            options,
            (error: Object, results: HealthValue[]) => {
                if (error) {
                    console.log('Error fetching basal energy:', error);
                    resolve(0);
                    return;
                }

                // Sum all basal energy samples for the day
                const total = results.reduce((sum, sample) => {
                    return sum + (sample.value || 0);
                }, 0);

                resolve(total);
            }
        );
    });

    // Return total (Active + Basal)
    return activeEnergy + basalEnergy;
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
