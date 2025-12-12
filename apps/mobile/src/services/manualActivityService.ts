// Advanced Manual Activity Calorie Calculation Service
// Multi-parameter calculation system with personalization

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActivityById, type Activity } from '../constants/activityDatabase';

// Types
export interface CalorieCalculationParams {
    activityType: string;
    intensity: 'light' | 'moderate' | 'vigorous';
    duration: number;  // minutes
    weight: number;    // kg
    age: number;
    gender: 'male' | 'female';
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'athlete';
    bmi?: number;
    heartRate?: number;  // average during activity (optional)
    environment?: 'indoor' | 'outdoor_hot' | 'outdoor_cold' | 'high_altitude';
}

export interface ManualActivity {
    id: string;
    date: string;
    activityType: string;
    activityName: string;
    category: 'cardio' | 'strength' | 'sports' | 'flexibility' | 'other';
    intensity: 'light' | 'moderate' | 'vigorous';
    duration: number;  // minutes

    // Advanced calculation parameters
    userAge: number;
    userGender: 'male' | 'female';
    userWeight: number;
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'athlete';
    bmi?: number;
    heartRate?: number;
    environment?: 'indoor' | 'outdoor_hot' | 'outdoor_cold' | 'high_altitude';

    // Calculation breakdown
    baseMET: number;
    adjustedMET: number;
    baseCalories: number;
    epocBonus: number;
    totalAdjustments: number;
    caloriesBurned: number;  // final result

    // Calculation details for transparency
    calculations: {
        baseCalories: number;
        ageAdjustment: number;
        genderAdjustment: number;
        fitnessAdjustment: number;
        bmiAdjustment: number;
        environmentAdjustment: number;
        epocBonus: number;
    };

    timestamp: string;
}

const STORAGE_KEY_MANUAL_ACTIVITIES = 'manualActivities';

/**
 * Age-based metabolic adjustment
 * Younger people have higher metabolism, older people have lower
 */
function getAgeAdjustment(age: number): number {
    if (age >= 18 && age <= 25) return 1.05;  // +5% (high metabolism)
    if (age >= 26 && age <= 35) return 1.00;  // baseline
    if (age >= 36 && age <= 45) return 0.97;  // -3%
    if (age >= 46 && age <= 55) return 0.95;  // -5%
    if (age >= 56 && age <= 65) return 0.92;  // -8%
    return 0.90;  // 66+ = -10%
}

/**
 * Gender-based adjustment
 * Men typically have more muscle mass = higher calorie burn
 */
function getGenderAdjustment(gender: 'male' | 'female'): number {
    return gender === 'male' ? 1.00 : 0.95;  // Female: -5%
}

/**
 * Fitness level adjustment
 * Beginners are less efficient (burn more), athletes are more efficient (burn less)
 */
function getFitnessAdjustment(level: string): number {
    switch (level) {
        case 'beginner': return 1.10;     // +10% (inefficient)
        case 'intermediate': return 1.00;  // baseline
        case 'advanced': return 0.92;      // -8% (efficient)
        case 'athlete': return 0.88;       // -12% (very efficient)
        default: return 1.00;
    }
}

/**
 * BMI-based adjustment
 * Higher body mass = more calories burned
 */
function getBMIAdjustment(bmi?: number): number {
    if (!bmi) return 1.00;

    if (bmi < 18.5) return 0.95;        // Underweight: -5%
    if (bmi >= 18.5 && bmi < 25) return 1.00;  // Normal: baseline
    if (bmi >= 25 && bmi < 30) return 1.05;    // Overweight: +5%
    return 1.08;  // Obese (30+): +8%
}

/**
 * Environmental factors adjustment
 * Extreme temperatures or altitude increase energy expenditure
 */
function getEnvironmentAdjustment(environment?: string): number {
    switch (environment) {
        case 'outdoor_hot': return 1.08;      // +8% (heat stress)
        case 'outdoor_cold': return 1.10;     // +10% (thermoregulation)
        case 'high_altitude': return 1.06;    // +6% (lower oxygen)
        case 'indoor':
        default: return 1.00;  // baseline
    }
}

/**
 * Calculate EPOC (Excess Post-exercise Oxygen Consumption) bonus
 * Higher intensity activities continue burning calories after exercise
 */
function getEPOCBonus(activity: Activity | undefined, intensity: string): number {
    if (!activity) return 0;

    // Base EPOC from activity type
    let epocFactor = activity.epocFactor || 1.0;

    // Intensity multiplier
    let intensityMultiplier = 1.0;
    if (intensity === 'vigorous') intensityMultiplier = 1.5;
    else if (intensity === 'moderate') intensityMultiplier = 1.0;
    else intensityMultiplier = 0.5;  // light

    // EPOC bonus is (factor - 1.0) * intensity multiplier
    const epocBonus = (epocFactor - 1.0) * intensityMultiplier;

    return epocBonus;
}

/**
 * Heart rate-based calorie calculation (optional, blended with MET)
 * Formula: ((Age - Actual_HR) × Weight_kg × Duration_min × 0.6309) / 200
 */
function calculateHRBasedCalories(
    age: number,
    heartRate: number,
    weight: number,
    duration: number
): number {
    return ((age - heartRate) * weight * duration * 0.6309) / 200;
}

/**
 * Main calorie calculation function with all parameters
 */
export function calculateAdvancedCalories(params: CalorieCalculationParams): {
    totalCalories: number;
    breakdown: {
        baseCalories: number;
        baseMET: number;
        adjustedMET: number;
        ageAdjustment: number;
        genderAdjustment: number;
        fitnessAdjustment: number;
        bmiAdjustment: number;
        environmentAdjustment: number;
        epocBonus: number;
        heartRateBlend?: number;
    };
} {
    const {
        activityType,
        intensity,
        duration,
        weight,
        age,
        gender,
        fitnessLevel,
        bmi,
        heartRate,
        environment
    } = params;

    // Get activity from database
    const activity = getActivityById(activityType);
    if (!activity) {
        throw new Error(`Activity not found: ${activityType}`);
    }

    // Get MET value based on intensity
    const baseMET = activity.mets[intensity] || activity.mets.moderate || 5.0;

    // Base calorie calculation using MET
    // Formula: (MET × 3.5 × Weight_kg × Duration_min) / 200
    const baseCalories = (baseMET * 3.5 * weight * duration) / 200;

    // Apply adjustments
    const ageAdj = getAgeAdjustment(age);
    const genderAdj = getGenderAdjustment(gender);
    const fitnessAdj = getFitnessAdjustment(fitnessLevel);
    const bmiAdj = getBMIAdjustment(bmi);
    const envAdj = getEnvironmentAdjustment(environment);

    // Calculate adjusted MET
    const adjustedMET = baseMET * ageAdj * genderAdj * fitnessAdj * bmiAdj * envAdj;

    // Calculate EPOC bonus
    const epocBonus = getEPOCBonus(activity, intensity);

    // Apply all adjustments
    let finalCalories = baseCalories * ageAdj * genderAdj * fitnessAdj * bmiAdj * envAdj;

    // Add EPOC bonus
    finalCalories = finalCalories * (1 + epocBonus);

    // Heart rate blending (optional)
    let heartRateBlend: number | undefined;
    if (heartRate && heartRate > 0) {
        const hrCalories = calculateHRBasedCalories(age, heartRate, weight, duration);
        // Blend: 60% MET-based, 40% HR-based
        heartRateBlend = (finalCalories * 0.6) + (hrCalories * 0.4);
        finalCalories = heartRateBlend;
    }

    return {
        totalCalories: Math.round(finalCalories),
        breakdown: {
            baseCalories: Math.round(baseCalories),
            baseMET,
            adjustedMET: Math.round(adjustedMET * 10) / 10,
            ageAdjustment: Math.round((ageAdj - 1) * baseCalories),
            genderAdjustment: Math.round((genderAdj - 1) * baseCalories),
            fitnessAdjustment: Math.round((fitnessAdj - 1) * baseCalories),
            bmiAdjustment: Math.round((bmiAdj - 1) * baseCalories),
            environmentAdjustment: Math.round((envAdj - 1) * baseCalories),
            epocBonus: Math.round(finalCalories * epocBonus),
            heartRateBlend: heartRateBlend ? Math.round(heartRateBlend) : undefined
        }
    };
}

/**
 * Add a manual activity
 */
export async function addManualActivity(params: CalorieCalculationParams): Promise<ManualActivity> {
    const activity = getActivityById(params.activityType);
    if (!activity) {
        throw new Error(`Activity not found: ${params.activityType}`);
    }

    // Calculate calories with full breakdown
    const result = calculateAdvancedCalories(params);

    // Create activity record
    const manualActivity: ManualActivity = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        activityType: params.activityType,
        activityName: activity.name,
        category: activity.category,
        intensity: params.intensity,
        duration: params.duration,
        userAge: params.age,
        userGender: params.gender,
        userWeight: params.weight,
        fitnessLevel: params.fitnessLevel,
        bmi: params.bmi,
        heartRate: params.heartRate,
        environment: params.environment,
        baseMET: result.breakdown.baseMET,
        adjustedMET: result.breakdown.adjustedMET,
        baseCalories: result.breakdown.baseCalories,
        epocBonus: result.breakdown.epocBonus,
        totalAdjustments: result.breakdown.ageAdjustment + result.breakdown.genderAdjustment +
            result.breakdown.fitnessAdjustment + result.breakdown.bmiAdjustment +
            result.breakdown.environmentAdjustment,
        caloriesBurned: result.totalCalories,
        calculations: {
            baseCalories: result.breakdown.baseCalories,
            ageAdjustment: result.breakdown.ageAdjustment,
            genderAdjustment: result.breakdown.genderAdjustment,
            fitnessAdjustment: result.breakdown.fitnessAdjustment,
            bmiAdjustment: result.breakdown.bmiAdjustment,
            environmentAdjustment: result.breakdown.environmentAdjustment,
            epocBonus: result.breakdown.epocBonus
        },
        timestamp: new Date().toISOString()
    };

    // Save to storage
    const stored = await AsyncStorage.getItem(STORAGE_KEY_MANUAL_ACTIVITIES);
    const activities: { [date: string]: ManualActivity[] } = stored ? JSON.parse(stored) : {};

    const dateKey = manualActivity.date;
    if (!activities[dateKey]) {
        activities[dateKey] = [];
    }
    activities[dateKey].push(manualActivity);

    await AsyncStorage.setItem(STORAGE_KEY_MANUAL_ACTIVITIES, JSON.stringify(activities));

    return manualActivity;
}

/**
 * Get manual activities for a specific date
 */
export async function getManualActivities(date: string): Promise<ManualActivity[]> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_MANUAL_ACTIVITIES);
    if (!stored) return [];

    const activities: { [date: string]: ManualActivity[] } = JSON.parse(stored);
    return activities[date] || [];
}

/**
 * Delete a manual activity
 */
export async function deleteManualActivity(activityId: string, date: string): Promise<void> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_MANUAL_ACTIVITIES);
    if (!stored) return;

    const activities: { [date: string]: ManualActivity[] } = JSON.parse(stored);
    if (!activities[date]) return;

    activities[date] = activities[date].filter(a => a.id !== activityId);

    if (activities[date].length === 0) {
        delete activities[date];
    }

    await AsyncStorage.setItem(STORAGE_KEY_MANUAL_ACTIVITIES, JSON.stringify(activities));
}

/**
 * Get total calories burned from manual activities for a date
 */
export async function getTotalManualCalories(date: string): Promise<number> {
    const activities = await getManualActivities(date);
    return activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
}

/**
 * Get personalized MET value based on user profile
 */
export function getPersonalizedMET(
    baseMET: number,
    age: number,
    gender: 'male' | 'female',
    fitnessLevel: string,
    bmi?: number
): number {
    const ageAdj = getAgeAdjustment(age);
    const genderAdj = getGenderAdjustment(gender);
    const fitnessAdj = getFitnessAdjustment(fitnessLevel);
    const bmiAdj = getBMIAdjustment(bmi);

    return baseMET * ageAdj * genderAdj * fitnessAdj * bmiAdj;
}
