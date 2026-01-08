
export interface Activity {
    id: string;
    nameKey: string; // i18n key for activity name
    category: 'cardio' | 'strength' | 'sports' | 'flexibility' | 'other';
    icon: string;
    mets: {
        light?: number;
        moderate?: number;
        vigorous?: number;
    };
    descriptionKey: string; // i18n key for description
    epocFactor: number;
}

export const ACTIVITY_DATABASE: Activity[] = [
    // CARDIO ACTIVITIES
    {
        id: 'running',
        nameKey: 'activities.running',
        category: 'cardio',
        icon: '🏃',
        mets: {
            light: 6.0,    // 4 mph (15 min/mile)
            moderate: 10.0, // 6 mph (10 min/mile)
            vigorous: 12.5  // 7.5 mph (8 min/mile)
        },
        descriptionKey: 'activityDescriptions.running',
        epocFactor: 1.08
    },
    {
        id: 'jogging',
        nameKey: 'activities.jogging',
        category: 'cardio',
        icon: '🏃‍♂️',
        mets: {
            light: 7.0,
            moderate: 8.8,
            vigorous: 10.0
        },
        descriptionKey: 'activityDescriptions.jogging',
        epocFactor: 1.08
    },
    {
        id: 'cycling',
        nameKey: 'activities.cycling',
        category: 'cardio',
        icon: '🚴',
        mets: {
            light: 4.0,    // <10 mph
            moderate: 8.0,  // 12-13 mph
            vigorous: 16.0  // 20+ mph
        },
        descriptionKey: 'activityDescriptions.cycling',
        epocFactor: 1.08
    },
    {
        id: 'swimming',
        nameKey: 'activities.swimming',
        category: 'cardio',
        icon: '🏊',
        mets: {
            light: 6.0,    // leisurely
            moderate: 7.0,  // moderate laps
            vigorous: 11.0  // fast/vigorous laps
        },
        descriptionKey: 'activityDescriptions.swimming',
        epocFactor: 1.10
    },
    {
        id: 'walking',
        nameKey: 'activities.walking',
        category: 'cardio',
        icon: '🚶',
        mets: {
            light: 2.5,    // <2 mph
            moderate: 3.5,  // 3 mph
            vigorous: 5.0   // 4+ mph
        },
        descriptionKey: 'activityDescriptions.walking',
        epocFactor: 1.03
    },
    {
        id: 'hiking',
        nameKey: 'activities.hiking',
        category: 'cardio',
        icon: '🥾',
        mets: {
            light: 4.5,
            moderate: 6.0,
            vigorous: 7.5
        },
        descriptionKey: 'activityDescriptions.hiking',
        epocFactor: 1.05
    },
    {
        id: 'stairs',
        nameKey: 'activities.stairs',
        category: 'cardio',
        icon: '🪜',
        mets: {
            light: 4.0,
            moderate: 8.0,
            vigorous: 15.0
        },
        descriptionKey: 'activityDescriptions.stairs',
        epocFactor: 1.10
    },
    {
        id: 'elliptical',
        nameKey: 'activities.elliptical',
        category: 'cardio',
        icon: '🏃‍♀️',
        mets: {
            light: 4.5,
            moderate: 6.0,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.elliptical',
        epocFactor: 1.06
    },
    {
        id: 'rowing',
        nameKey: 'activities.rowing',
        category: 'cardio',
        icon: '🚣',
        mets: {
            light: 3.5,
            moderate: 7.0,
            vigorous: 12.0
        },
        descriptionKey: 'activityDescriptions.rowing',
        epocFactor: 1.12
    },
    {
        id: 'jump_rope',
        nameKey: 'activities.jump_rope',
        category: 'cardio',
        icon: '🤸',
        mets: {
            moderate: 9.8,
            vigorous: 12.3
        },
        descriptionKey: 'activityDescriptions.jump_rope',
        epocFactor: 1.15
    },

    // STRENGTH TRAINING
    {
        id: 'weight_lifting',
        nameKey: 'activities.weight_lifting',
        category: 'strength',
        icon: '🏋️',
        mets: {
            light: 3.0,
            moderate: 5.0,
            vigorous: 6.0
        },
        descriptionKey: 'activityDescriptions.weight_lifting',
        epocFactor: 1.12
    },
    {
        id: 'bodyweight',
        nameKey: 'activities.bodyweight',
        category: 'strength',
        icon: '💪',
        mets: {
            light: 3.5,
            moderate: 5.0,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.bodyweight',
        epocFactor: 1.12
    },
    {
        id: 'crossfit',
        nameKey: 'activities.crossfit',
        category: 'strength',
        icon: '🤸‍♂️',
        mets: {
            moderate: 5.5,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.crossfit',
        epocFactor: 1.15
    },
    {
        id: 'kettlebell',
        nameKey: 'activities.kettlebell',
        category: 'strength',
        icon: '🏋️‍♀️',
        mets: {
            light: 4.0,
            moderate: 6.0,
            vigorous: 9.0
        },
        descriptionKey: 'activityDescriptions.kettlebell',
        epocFactor: 1.12
    },
    {
        id: 'resistance_band',
        nameKey: 'activities.resistance_band',
        category: 'strength',
        icon: '🎗️',
        mets: {
            light: 3.5,
            moderate: 5.0,
            vigorous: 6.5
        },
        descriptionKey: 'activityDescriptions.resistance_band',
        epocFactor: 1.08
    },

    // SPORTS
    {
        id: 'soccer',
        nameKey: 'activities.soccer',
        category: 'sports',
        icon: '⚽',
        mets: {
            moderate: 7.0,
            vigorous: 10.0
        },
        descriptionKey: 'activityDescriptions.soccer',
        epocFactor: 1.10
    },
    {
        id: 'basketball',
        nameKey: 'activities.basketball',
        category: 'sports',
        icon: '🏀',
        mets: {
            moderate: 6.5,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.basketball',
        epocFactor: 1.10
    },
    {
        id: 'tennis',
        nameKey: 'activities.tennis',
        category: 'sports',
        icon: '🎾',
        mets: {
            light: 5.0,
            moderate: 7.0,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.tennis',
        epocFactor: 1.08
    },
    {
        id: 'volleyball',
        nameKey: 'activities.volleyball',
        category: 'sports',
        icon: '🏐',
        mets: {
            moderate: 4.0,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.volleyball',
        epocFactor: 1.08
    },
    {
        id: 'badminton',
        nameKey: 'activities.badminton',
        category: 'sports',
        icon: '🏸',
        mets: {
            light: 4.5,
            moderate: 5.5,
            vigorous: 7.0
        },
        descriptionKey: 'activityDescriptions.badminton',
        epocFactor: 1.06
    },
    {
        id: 'table_tennis',
        nameKey: 'activities.table_tennis',
        category: 'sports',
        icon: '🏓',
        mets: {
            light: 4.0,
            moderate: 4.0,
            vigorous: 6.0
        },
        descriptionKey: 'activityDescriptions.table_tennis',
        epocFactor: 1.05
    },
    {
        id: 'boxing',
        nameKey: 'activities.boxing',
        category: 'sports',
        icon: '🥊',
        mets: {
            moderate: 6.0,
            vigorous: 12.8
        },
        descriptionKey: 'activityDescriptions.boxing',
        epocFactor: 1.15
    },
    {
        id: 'martial_arts',
        nameKey: 'activities.martial_arts',
        category: 'sports',
        icon: '🥋',
        mets: {
            moderate: 6.0,
            vigorous: 10.0
        },
        descriptionKey: 'activityDescriptions.martial_arts',
        epocFactor: 1.12
    },
    {
        id: 'golf',
        nameKey: 'activities.golf',
        category: 'sports',
        icon: '⛳',
        mets: {
            light: 3.5,
            moderate: 4.8
        },
        descriptionKey: 'activityDescriptions.golf',
        epocFactor: 1.03
    },

    // FLEXIBILITY & BALANCE
    {
        id: 'yoga',
        nameKey: 'activities.yoga',
        category: 'flexibility',
        icon: '🧘',
        mets: {
            light: 2.5,
            moderate: 3.0,
            vigorous: 4.0
        },
        descriptionKey: 'activityDescriptions.yoga',
        epocFactor: 1.03
    },
    {
        id: 'pilates',
        nameKey: 'activities.pilates',
        category: 'flexibility',
        icon: '🤸‍♀️',
        mets: {
            light: 3.0,
            moderate: 4.5,
            vigorous: 6.0
        },
        descriptionKey: 'activityDescriptions.pilates',
        epocFactor: 1.06
    },
    {
        id: 'stretching',
        nameKey: 'activities.stretching',
        category: 'flexibility',
        icon: '🧘‍♂️',
        mets: {
            light: 2.3,
            moderate: 3.5
        },
        descriptionKey: 'activityDescriptions.stretching',
        epocFactor: 1.02
    },
    {
        id: 'tai_chi',
        nameKey: 'activities.tai_chi',
        category: 'flexibility',
        icon: '🧘‍♀️',
        mets: {
            light: 3.0,
            moderate: 4.0
        },
        descriptionKey: 'activityDescriptions.tai_chi',
        epocFactor: 1.03
    },

    // OTHER ACTIVITIES
    {
        id: 'dancing',
        nameKey: 'activities.dancing',
        category: 'other',
        icon: '💃',
        mets: {
            light: 3.0,
            moderate: 4.5,
            vigorous: 7.8
        },
        descriptionKey: 'activityDescriptions.dancing',
        epocFactor: 1.08
    },
    {
        id: 'zumba',
        nameKey: 'activities.zumba',
        category: 'other',
        icon: '💃🕺',
        mets: {
            moderate: 6.5,
            vigorous: 8.5
        },
        descriptionKey: 'activityDescriptions.zumba',
        epocFactor: 1.10
    },
    {
        id: 'aerobics',
        nameKey: 'activities.aerobics',
        category: 'other',
        icon: '🤸',
        mets: {
            light: 4.5,
            moderate: 6.5,
            vigorous: 10.0
        },
        descriptionKey: 'activityDescriptions.aerobics',
        epocFactor: 1.10
    },
    {
        id: 'spinning',
        nameKey: 'activities.spinning',
        category: 'other',
        icon: '🚴‍♀️',
        mets: {
            moderate: 8.5,
            vigorous: 12.0
        },
        descriptionKey: 'activityDescriptions.spinning',
        epocFactor: 1.12
    },
    {
        id: 'climb_stairs_daily',
        nameKey: 'activities.climb_stairs_daily',
        category: 'other',
        icon: '🪜',
        mets: {
            light: 3.5,
            moderate: 4.0
        },
        descriptionKey: 'activityDescriptions.climb_stairs_daily',
        epocFactor: 1.03
    },
    {
        id: 'housework',
        nameKey: 'activities.housework',
        category: 'other',
        icon: '🧹',
        mets: {
            light: 2.5,
            moderate: 3.5,
            vigorous: 4.5
        },
        descriptionKey: 'activityDescriptions.housework',
        epocFactor: 1.02
    },
    {
        id: 'gardening',
        nameKey: 'activities.gardening',
        category: 'other',
        icon: '🌱',
        mets: {
            light: 3.0,
            moderate: 4.0,
            vigorous: 5.0
        },
        descriptionKey: 'activityDescriptions.gardening',
        epocFactor: 1.03
    },
    {
        id: 'skating',
        nameKey: 'activities.skating',
        category: 'other',
        icon: '⛸️',
        mets: {
            moderate: 5.5,
            vigorous: 9.0
        },
        descriptionKey: 'activityDescriptions.skating',
        epocFactor: 1.08
    },
    {
        id: 'skiing',
        nameKey: 'activities.skiing',
        category: 'other',
        icon: '⛷️',
        mets: {
            moderate: 5.3,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.skiing',
        epocFactor: 1.10
    },
    {
        id: 'snowboarding',
        nameKey: 'activities.snowboarding',
        category: 'other',
        icon: '🏂',
        mets: {
            moderate: 5.3,
            vigorous: 8.0
        },
        descriptionKey: 'activityDescriptions.snowboarding',
        epocFactor: 1.10
    }
];

// Activity category keys for i18n
export const ACTIVITY_CATEGORY_KEYS = {
    cardio: 'calories.categories.cardio',
    strength: 'calories.categories.strength',
    sports: 'calories.categories.sports',
    flexibility: 'calories.categories.flexibility',
    other: 'calories.categories.other'
};

// Helper function to get activity by ID
export function getActivityById(id: string): Activity | undefined {
    return ACTIVITY_DATABASE.find(activity => activity.id === id);
}

// Helper function to get activities by category
export function getActivitiesByCategory(category: Activity['category']): Activity[] {
    return ACTIVITY_DATABASE.filter(activity => activity.category === category);
}

// Helper function to get all activity IDs
export function getAllActivityIds(): string[] {
    return ACTIVITY_DATABASE.map(activity => activity.id);
}
