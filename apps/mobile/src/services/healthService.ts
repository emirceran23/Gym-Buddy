// Platform-Agnostic Health Service
// Unified API for HealthKit (iOS) and Health Connect (Android)

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthPermissions, CalorieData, DailyCalorieSummary } from '../types/health';
import { getTotalManualCalories, getManualActivities } from './manualActivityService';

// Import platform-specific services (will be created next)
let HealthKitService: any;
let HealthConnectService: any;

if (Platform.OS === 'ios') {
    HealthKitService = require('./ios/HealthKitService');
} else if (Platform.OS === 'android') {
    HealthConnectService = require('./android/HealthConnectService');
}

const STORAGE_KEY_HEALTH_PERMISSIONS = 'healthPermissions';
const STORAGE_KEY_DAILY_CALORIES = 'dailyCaloriesBurned';
const STORAGE_KEY_LAST_SYNC = 'lastHealthSync';

/**
 * Check if health data is available on this platform
 */
export async function isHealthDataAvailable(): Promise<boolean> {
    try {
        if (Platform.OS === 'ios') {
            return await HealthKitService.isAvailable();
        } else if (Platform.OS === 'android') {
            return await HealthConnectService.isAvailable();
        }
        return false;
    } catch (error) {
        console.error('Error checking health data availability:', error);
        return false;
    }
}

/**
 * Request health permissions from user
 */
export async function requestHealthPermissions(): Promise<boolean> {
    try {
        let granted = false;

        if (Platform.OS === 'ios') {
            granted = await HealthKitService.requestPermissions();
        } else if (Platform.OS === 'android') {
            granted = await HealthConnectService.requestPermissions();
        } else {
            return false;
        }

        // Store permission state
        const permissions: HealthPermissions = {
            granted,
            canReadCalories: granted,
            platform: Platform.OS as 'ios' | 'android'
        };

        await AsyncStorage.setItem(STORAGE_KEY_HEALTH_PERMISSIONS, JSON.stringify(permissions));
        return granted;
    } catch (error) {
        console.error('Error requesting health permissions:', error);
        return false;
    }
}

/**
 * Get current health permissions
 */
export async function getHealthPermissions(): Promise<HealthPermissions> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_HEALTH_PERMISSIONS);
    if (stored) {
        return JSON.parse(stored);
    }

    return {
        granted: false,
        canReadCalories: false,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown'
    };
}

/**
 * Fetch calories burned from smartwatch for a specific date
 */
export async function fetchCaloriesBurned(date: string): Promise<number> {
    try {
        const permissions = await getHealthPermissions();
        if (!permissions.granted) {
            console.log('Health permissions not granted');
            return 0;
        }

        let calories = 0;

        if (Platform.OS === 'ios') {
            calories = await HealthKitService.fetchCalories(date);
        } else if (Platform.OS === 'android') {
            calories = await HealthConnectService.fetchCalories(date);
        }

        return Math.round(calories);
    } catch (error) {
        console.error('Error fetching calories:', error);
        return 0;
    }
}

/**
 * Sync today's calories (smartwatch + manual)
 */
export async function syncDailyCalories(): Promise<DailyCalorieSummary> {
    const today = new Date().toISOString().split('T')[0];

    // Get smartwatch calories
    const smartwatchCalories = await fetchCaloriesBurned(today);

    // Get manual activity calories
    const manualCalories = await getTotalManualCalories(today);
    const manualActivities = await getManualActivities(today);

    // Determine data source
    let dataSource: 'smartwatch' | 'manual' | 'hybrid' = 'manual';
    if (smartwatchCalories > 0 && manualCalories > 0) {
        dataSource = 'hybrid';
    } else if (smartwatchCalories > 0) {
        dataSource = 'smartwatch';
    }

    const summary: DailyCalorieSummary = {
        date: today,
        smartwatchCalories,
        manualCalories,
        totalCalories: smartwatchCalories + manualCalories,
        activities: manualActivities,
        dataSource,
        lastSync: new Date().toISOString()
    };

    // Store summary
    const stored = await AsyncStorage.getItem(STORAGE_KEY_DAILY_CALORIES);
    const allSummaries: { [date: string]: DailyCalorieSummary } = stored ? JSON.parse(stored) : {};
    allSummaries[today] = summary;
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_CALORIES, JSON.stringify(allSummaries));

    // Update last sync time
    await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());

    return summary;
}

/**
 * Get daily calorie summary for a specific date
 */
export async function getDailyCalorieSummary(date: string): Promise<DailyCalorieSummary | null> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_DAILY_CALORIES);
    if (!stored) return null;

    const allSummaries: { [date: string]: DailyCalorieSummary } = JSON.parse(stored);
    return allSummaries[date] || null;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

/**
 * Check if sync is needed (last sync > 1 hour ago or no sync yet)
 */
export async function needsSync(): Promise<boolean> {
    const lastSync = await getLastSyncTime();
    if (!lastSync) return true;

    const lastSyncTime = new Date(lastSync).getTime();
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    return (now - lastSyncTime) > oneHour;
}

/**
 * Get weekly calorie totals
 */
export async function getWeeklyCalories(): Promise<{
    dates: string[];
    smartwatch: number[];
    manual: number[];
    totals: number[];
}> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_DAILY_CALORIES);
    if (!stored) {
        return { dates: [], smartwatch: [], manual: [], totals: [] };
    }

    const allSummaries: { [date: string]: DailyCalorieSummary } = JSON.parse(stored);

    // Get last 7 days
    const dates: string[] = [];
    const smartwatch: number[] = [];
    const manual: number[] = [];
    const totals: number[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        dates.push(dateStr);

        const summary = allSummaries[dateStr];
        if (summary) {
            smartwatch.push(summary.smartwatchCalories);
            manual.push(summary.manualCalories);
            totals.push(summary.totalCalories);
        } else {
            smartwatch.push(0);
            manual.push(0);
            totals.push(0);
        }
    }

    return { dates, smartwatch, manual, totals };
}
