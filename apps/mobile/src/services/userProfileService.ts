// User Profile Service
// Manages fitness level, BMI, and user preferences

import AsyncStorage from '@react-native-async-storage/async-storage';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete';

export interface UserProfile {
    age: number;
    gender: 'male' | 'female';
    weight: number;  // kg
    height: number;  // cm
    targetWeight: number;  // kg
    weeklyChange: number;  // kg per week
    goal: string;
    bmi: number;
    fitnessLevel: FitnessLevel;
    lastFitnessUpdate: string;  // ISO timestamp
}

const STORAGE_KEY_FITNESS_LEVEL = 'userFitnessLevel';
const STORAGE_KEY_USER_PROFILE = 'userData';  // Using existing key for compatibility

/**
 * Calculate BMI from weight and height
 */
export function calculateBMI(weight: number, height: number): number {
    // BMI = weight(kg) / (height(m))^2
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;  // Round to 1 decimal
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi >= 18.5 && bmi < 25) return 'Normal';
    if (bmi >= 25 && bmi < 30) return 'Overweight';
    return 'Obese';
}

/**
 * Set user's fitness level
 */
export async function setFitnessLevel(level: FitnessLevel): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_FITNESS_LEVEL, JSON.stringify({
        level,
        lastUpdated: new Date().toISOString()
    }));
}

/**
 * Get user's fitness level
 */
export async function getFitnessLevel(): Promise<FitnessLevel> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_FITNESS_LEVEL);
    if (!stored) return 'intermediate';  // default

    const data = JSON.parse(stored);
    return data.level;
}

/**
 * Get complete user profile with calculated BMI
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (!stored) return null;

    const userData = JSON.parse(stored);
    const fitnessLevel = await getFitnessLevel();

    const bmi = calculateBMI(userData.weight, userData.height);

    const fitnessData = await AsyncStorage.getItem(STORAGE_KEY_FITNESS_LEVEL);
    const lastUpdate = fitnessData
        ? JSON.parse(fitnessData).lastUpdated
        : new Date().toISOString();

    return {
        ...userData,
        bmi,
        fitnessLevel,
        lastFitnessUpdate: lastUpdate
    };
}

/**
 * Suggest fitness level update based on activity history
 * Returns true if user should consider updating their fitness level
 */
export async function suggestFitnessLevelUpdate(): Promise<boolean> {
    const fitnessData = await AsyncStorage.getItem(STORAGE_KEY_FITNESS_LEVEL);
    if (!fitnessData) return false;

    const { lastUpdated, level } = JSON.parse(fitnessData);
    const lastUpdateDate = new Date(lastUpdated);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));

    // Suggest update after 30 days for beginners, 60 days for intermediate, 90 days for advanced
    const thresholds: Record<FitnessLevel, number> = {
        beginner: 30,
        intermediate: 60,
        advanced: 90,
        athlete: 180  // athletes rarely change level
    };

    return daysSinceUpdate >= thresholds[level as FitnessLevel];
}

/**
 * Analyze activity history to recommend fitness level
 * Based on frequency and intensity of activities over past 30 days
 */
export async function analyzeFitnessLevel(): Promise<{
    recommended: FitnessLevel;
    confidence: number;  // 0-100%
    reasoning: string;
}> {
    // Get manual activities from past 30 days
    const manualActivities = await AsyncStorage.getItem('manualActivities');
    if (!manualActivities) {
        return {
            recommended: 'beginner',
            confidence: 50,
            reasoning: 'No activity history found. Starting with beginner level.'
        };
    }

    const activities = JSON.parse(manualActivities);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Collect activities from past 30 days
    let totalActivities = 0;
    let vigorousCount = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    Object.entries(activities).forEach(([date, dayActivities]: [string, any]) => {
        const activityDate = new Date(date);
        if (activityDate >= thirtyDaysAgo) {
            (dayActivities as any[]).forEach(activity => {
                totalActivities++;
                if (activity.intensity === 'vigorous') vigorousCount++;
                totalDuration += activity.duration;
                totalCalories += activity.caloriesBurned;
            });
        }
    });

    // Calculate metrics
    const avgActivitiesPerWeek = (totalActivities / 30) * 7;
    const avgDurationPerActivity = totalActivities > 0 ? totalDuration / totalActivities : 0;
    const vigorousPercentage = totalActivities > 0 ? (vigorousCount / totalActivities) * 100 : 0;

    // Decision logic
    let recommended: FitnessLevel;
    let confidence: number;
    let reasoning: string;

    if (avgActivitiesPerWeek >= 5 && avgDurationPerActivity >= 60 && vigorousPercentage >= 50) {
        recommended = 'athlete';
        confidence = 90;
        reasoning = `${avgActivitiesPerWeek.toFixed(1)} activities/week with ${vigorousPercentage.toFixed(0)}% vigorous intensity suggests athlete level.`;
    } else if (avgActivitiesPerWeek >= 4 && avgDurationPerActivity >= 45 && vigorousPercentage >= 30) {
        recommended = 'advanced';
        confidence = 85;
        reasoning = `${avgActivitiesPerWeek.toFixed(1)} activities/week with good intensity suggests advanced level.`;
    } else if (avgActivitiesPerWeek >= 3 && avgDurationPerActivity >= 30) {
        recommended = 'intermediate';
        confidence = 80;
        reasoning = `${avgActivitiesPerWeek.toFixed(1)} activities/week suggests intermediate level.`;
    } else {
        recommended = 'beginner';
        confidence = 75;
        reasoning = `${avgActivitiesPerWeek.toFixed(1)} activities/week suggests beginner level.`;
    }

    return { recommended, confidence, reasoning };
}

/**
 * Update user profile with new weight (also recalculates BMI)
 */
export async function updateUserWeight(weight: number): Promise<void> {
    const profile = await getUserProfile();
    if (!profile) throw new Error('User profile not found');

    const updated = { ...profile, weight };
    await AsyncStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(updated));
}
