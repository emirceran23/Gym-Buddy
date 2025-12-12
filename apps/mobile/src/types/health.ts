// Health Data Types
// Shared types for health tracking

export interface HealthPermissions {
    granted: boolean;
    canReadCalories: boolean;
    platform: 'ios' | 'android' | 'unknown';
}

export interface CalorieData {
    date: string;
    calories: number;
    source: 'healthkit' | 'healthconnect' | 'manual';
    timestamp: string;
    activityDetails?: {
        activityType: string;
        intensity: 'light' | 'moderate' | 'vigorous';
        duration: number;
        met: number;
    };
}

export interface DailyCalorieSummary {
    date: string;
    smartwatchCalories: number;
    manualCalories: number;
    totalCalories: number;
    activities: any[];  // ManualActivity[] from manualActivityService
    dataSource: 'smartwatch' | 'manual' | 'hybrid';
    lastSync?: string;
}

export interface CalorieGoal {
    daily: number;
    weekly: number;
    monthly: number;
}
