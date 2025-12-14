// Strength Exercise Database
// Parses exercises.json and provides filtered access to strength exercises

import exercisesData from '../../exercises.json';

// Types
export interface StrengthExercise {
    id: string;
    name: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    equipment: string | null;
    level: 'beginner' | 'intermediate' | 'expert';
    mechanic: 'compound' | 'isolation' | null;
    force: 'push' | 'pull' | 'static' | null;
    instructions: string[];
}

export interface MuscleGroup {
    id: string;
    name: string;
    translationKey: string; // i18n key for dynamic translations
    icon: string;
    muscles: string[];
}

// Muscle group definitions with translation keys for i18n
export const MUSCLE_GROUPS: MuscleGroup[] = [
    {
        id: 'chest',
        name: 'Göğüs',
        translationKey: 'muscleGroups.chest',
        icon: '🫁',
        muscles: ['chest']
    },
    {
        id: 'back',
        name: 'Sırt',
        translationKey: 'muscleGroups.back',
        icon: '🔙',
        muscles: ['lats', 'middle back', 'lower back', 'traps']
    },
    {
        id: 'shoulders',
        name: 'Omuz',
        translationKey: 'muscleGroups.shoulders',
        icon: '🏋️',
        muscles: ['shoulders']
    },
    {
        id: 'biceps',
        name: 'Biceps',
        translationKey: 'muscleGroups.biceps',
        icon: '💪',
        muscles: ['biceps']
    },
    {
        id: 'triceps',
        name: 'Triceps',
        translationKey: 'muscleGroups.triceps',
        icon: '💪',
        muscles: ['triceps']
    },
    {
        id: 'forearms',
        name: 'Ön Kol',
        translationKey: 'muscleGroups.forearms',
        icon: '✊',
        muscles: ['forearms']
    },
    {
        id: 'quadriceps',
        name: 'Ön Bacak',
        translationKey: 'muscleGroups.quads',
        icon: '🦵',
        muscles: ['quadriceps']
    },
    {
        id: 'hamstrings',
        name: 'Arka Bacak',
        translationKey: 'muscleGroups.hamstrings',
        icon: '🦵',
        muscles: ['hamstrings', 'glutes']
    },
    {
        id: 'calves',
        name: 'Baldır',
        translationKey: 'muscleGroups.calves',
        icon: '🦶',
        muscles: ['calves']
    },
    {
        id: 'abdominals',
        name: 'Karın',
        translationKey: 'muscleGroups.abs',
        icon: '🎯',
        muscles: ['abdominals']
    },
    {
        id: 'adductors',
        name: 'İç Bacak',
        translationKey: 'muscleGroups.adductors',
        icon: '🦵',
        muscles: ['adductors', 'abductors']
    }
];

// Equipment key mapping from exercises.json values to i18n keys
export const EQUIPMENT_KEY_MAP: { [key: string]: string } = {
    'dumbbell': 'equipment.dumbbell',
    'barbell': 'equipment.barbell',
    'cable': 'equipment.cable',
    'machine': 'equipment.machine',
    'body only': 'equipment.body_only',
    'kettlebells': 'equipment.kettlebell',
    'e-z curl bar': 'equipment.ez_curl_bar',
    'exercise ball': 'equipment.exercise_ball',
    'foam roll': 'equipment.foam_roll',
    'medicine ball': 'equipment.medicine_ball',
    'bands': 'equipment.bands',
    'other': 'equipment.other',
    'null': 'equipment.none'
};

// Equipment translations
export const EQUIPMENT_TRANSLATIONS: { [key: string]: string } = {
    'dumbbell': 'Dambıl',
    'barbell': 'Barbell',
    'cable': 'Kablo',
    'machine': 'Makine',
    'body only': 'Vücut Ağırlığı',
    'kettlebells': 'Kettlebell',
    'e-z curl bar': 'EZ Bar',
    'exercise ball': 'Pilates Topu',
    'foam roll': 'Foam Roller',
    'medicine ball': 'Medicine Ball',
    'bands': 'Direnç Bandı',
    'other': 'Diğer',
    'null': 'Ekipmansız'
};

// Level translations
export const LEVEL_TRANSLATIONS: { [key: string]: string } = {
    'beginner': 'Başlangıç',
    'intermediate': 'Orta',
    'expert': 'İleri'
};

// Filter strength exercises from the database
export function getStrengthExercises(): StrengthExercise[] {
    return (exercisesData as any[])
        .filter(e => e.category === 'strength')
        .map(e => ({
            id: e.id,
            name: e.name,
            primaryMuscles: e.primaryMuscles || [],
            secondaryMuscles: e.secondaryMuscles || [],
            equipment: e.equipment,
            level: e.level as 'beginner' | 'intermediate' | 'expert',
            mechanic: e.mechanic as 'compound' | 'isolation' | null,
            force: e.force as 'push' | 'pull' | 'static' | null,
            instructions: e.instructions || []
        }));
}

// Get exercises by target muscle group
export function getExercisesByMuscleGroup(muscleGroupId: string): StrengthExercise[] {
    const muscleGroup = MUSCLE_GROUPS.find(mg => mg.id === muscleGroupId);
    if (!muscleGroup) return [];

    const exercises = getStrengthExercises();
    return exercises.filter(exercise =>
        exercise.primaryMuscles.some(muscle =>
            muscleGroup.muscles.includes(muscle.toLowerCase())
        )
    );
}

// Get exercises by equipment type
export function getExercisesByEquipment(equipment: string): StrengthExercise[] {
    const exercises = getStrengthExercises();
    return exercises.filter(e => e.equipment === equipment);
}

// Search exercises by name
export function searchExercises(query: string, exercises: StrengthExercise[]): StrengthExercise[] {
    const lowerQuery = query.toLowerCase();
    return exercises.filter(e =>
        e.name.toLowerCase().includes(lowerQuery)
    );
}

// Get unique equipment types from strength exercises
export function getAvailableEquipment(): string[] {
    const exercises = getStrengthExercises();
    const equipmentSet = new Set<string>();
    exercises.forEach(e => {
        if (e.equipment) {
            equipmentSet.add(e.equipment);
        }
    });
    return Array.from(equipmentSet).sort();
}

// Get exercise by ID
export function getStrengthExerciseById(id: string): StrengthExercise | undefined {
    const exercises = getStrengthExercises();
    return exercises.find(e => e.id === id);
}

// Calculate calorie coefficient based on exercise type
export function getCalorieCoefficient(exercise: StrengthExercise): number {
    // Compound exercises burn more calories
    if (exercise.mechanic === 'compound') {
        return 0.05;
    }
    // Isolation exercises burn less
    return 0.03;
}

// Get MET value for strength exercise based on intensity
export function getStrengthMET(exercise: StrengthExercise, intensity: 'light' | 'moderate' | 'vigorous'): number {
    // Base MET values for strength training
    const baseMET = {
        light: 3.0,
        moderate: 5.0,
        vigorous: 6.0
    };

    // Compound exercises have higher MET
    if (exercise.mechanic === 'compound') {
        return baseMET[intensity] * 1.2;
    }

    return baseMET[intensity];
}

// Calculate estimated workout duration from sets, reps, and rest time
export function calculateWorkoutDuration(sets: number, reps: number, restTime: number): number {
    // Assume 3 seconds per rep
    const repTime = 3;
    const workTime = sets * reps * repTime;
    const totalRestTime = (sets - 1) * restTime;

    // Return total duration in minutes
    return Math.ceil((workTime + totalRestTime) / 60);
}
