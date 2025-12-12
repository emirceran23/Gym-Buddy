// Activity Database with MET (Metabolic Equivalent of Task) values
// Based on Compendium of Physical Activities 2024

export interface Activity {
    id: string;
    name: string;
    category: 'cardio' | 'strength' | 'sports' | 'flexibility' | 'other';
    icon: string;
    mets: {
        light?: number;
        moderate?: number;
        vigorous?: number;
    };
    description: string;
    epocFactor: number; // EPOC bonus multiplier (1.0 = no bonus)
}

export const ACTIVITY_DATABASE: Activity[] = [
    // CARDIO ACTIVITIES
    {
        id: 'running',
        name: 'Koşu',
        category: 'cardio',
        icon: '🏃',
        mets: {
            light: 6.0,    // 4 mph (15 min/mile)
            moderate: 10.0, // 6 mph (10 min/mile)
            vigorous: 12.5  // 7.5 mph (8 min/mile)
        },
        description: 'Açık havada veya koşu bandında koşu',
        epocFactor: 1.08
    },
    {
        id: 'jogging',
        name: 'Jogging',
        category: 'cardio',
        icon: '🏃‍♂️',
        mets: {
            light: 7.0,
            moderate: 8.8,
            vigorous: 10.0
        },
        description: 'Yavaş tempolu koşu',
        epocFactor: 1.08
    },
    {
        id: 'cycling',
        name: 'Bisiklet',
        category: 'cardio',
        icon: '🚴',
        mets: {
            light: 4.0,    // <10 mph
            moderate: 8.0,  // 12-13 mph
            vigorous: 16.0  // 20+ mph
        },
        description: 'Bisiklet sürme (açık hava veya sabit)',
        epocFactor: 1.08
    },
    {
        id: 'swimming',
        name: 'Yüzme',
        category: 'cardio',
        icon: '🏊',
        mets: {
            light: 6.0,    // leisurely
            moderate: 7.0,  // moderate laps
            vigorous: 11.0  // fast/vigorous laps
        },
        description: 'Havuz veya açık su yüzme',
        epocFactor: 1.10
    },
    {
        id: 'walking',
        name: 'Yürüyüş',
        category: 'cardio',
        icon: '🚶',
        mets: {
            light: 2.5,    // <2 mph
            moderate: 3.5,  // 3 mph
            vigorous: 5.0   // 4+ mph
        },
        description: 'Düz zeminde yürüyüş',
        epocFactor: 1.03
    },
    {
        id: 'hiking',
        name: 'Doğa Yürüyüşü',
        category: 'cardio',
        icon: '🥾',
        mets: {
            light: 4.5,
            moderate: 6.0,
            vigorous: 7.5
        },
        description: 'Doğada engebeli arazide yürüyüş',
        epocFactor: 1.05
    },
    {
        id: 'stairs',
        name: 'Merdiven Çıkma',
        category: 'cardio',
        icon: '🪜',
        mets: {
            light: 4.0,
            moderate: 8.0,
            vigorous: 15.0
        },
        description: 'Merdiven çıkma egzersizi',
        epocFactor: 1.10
    },
    {
        id: 'elliptical',
        name: 'Eliptik',
        category: 'cardio',
        icon: '🏃‍♀️',
        mets: {
            light: 4.5,
            moderate: 6.0,
            vigorous: 8.0
        },
        description: 'Eliptik bisiklet egzersizi',
        epocFactor: 1.06
    },
    {
        id: 'rowing',
        name: 'Kürek Çekme',
        category: 'cardio',
        icon: '🚣',
        mets: {
            light: 3.5,
            moderate: 7.0,
            vigorous: 12.0
        },
        description: 'Kürek çekme makinesi veya gerçek kürek',
        epocFactor: 1.12
    },
    {
        id: 'jump_rope',
        name: 'İp Atlama',
        category: 'cardio',
        icon: '🤸',
        mets: {
            moderate: 9.8,
            vigorous: 12.3
        },
        description: 'İp atlama egzersizi',
        epocFactor: 1.15
    },

    // STRENGTH TRAINING
    {
        id: 'weight_lifting',
        name: 'Ağırlık Kaldırma',
        category: 'strength',
        icon: '🏋️',
        mets: {
            light: 3.0,
            moderate: 5.0,
            vigorous: 6.0
        },
        description: 'Dambıl veya barbell ile ağırlık çalışması',
        epocFactor: 1.12
    },
    {
        id: 'bodyweight',
        name: 'Vücut Ağırlığı',
        category: 'strength',
        icon: '💪',
        mets: {
            light: 3.5,
            moderate: 5.0,
            vigorous: 8.0
        },
        description: 'Şınav, mekik, squat gibi egzersizler',
        epocFactor: 1.12
    },
    {
        id: 'crossfit',
        name: 'CrossFit',
        category: 'strength',
        icon: '🤸‍♂️',
        mets: {
            moderate: 5.5,
            vigorous: 8.0
        },
        description: 'Yüksek yoğunluklu fonksiyonel fitness',
        epocFactor: 1.15
    },
    {
        id: 'kettlebell',
        name: 'Kettlebell',
        category: 'strength',
        icon: '🏋️‍♀️',
        mets: {
            light: 4.0,
            moderate: 6.0,
            vigorous: 9.0
        },
        description: 'Kettlebell swing ve diğer hareketler',
        epocFactor: 1.12
    },
    {
        id: 'resistance_band',
        name: 'Direnç Bandı',
        category: 'strength',
        icon: '🎗️',
        mets: {
            light: 3.5,
            moderate: 5.0,
            vigorous: 6.5
        },
        description: 'Elastik band ile güçlendirme',
        epocFactor: 1.08
    },

    // SPORTS
    {
        id: 'soccer',
        name: 'Futbol',
        category: 'sports',
        icon: '⚽',
        mets: {
            moderate: 7.0,
            vigorous: 10.0
        },
        description: 'Futbol maçı veya antrenmanı',
        epocFactor: 1.10
    },
    {
        id: 'basketball',
        name: 'Basketbol',
        category: 'sports',
        icon: '🏀',
        mets: {
            moderate: 6.5,
            vigorous: 8.0
        },
        description: 'Basketbol maçı veya antrenmanı',
        epocFactor: 1.10
    },
    {
        id: 'tennis',
        name: 'Tenis',
        category: 'sports',
        icon: '🎾',
        mets: {
            light: 5.0,
            moderate: 7.0,
            vigorous: 8.0
        },
        description: 'Tenis maçı (tekler veya çiftler)',
        epocFactor: 1.08
    },
    {
        id: 'volleyball',
        name: 'Voleybol',
        category: 'sports',
        icon: '🏐',
        mets: {
            moderate: 4.0,
            vigorous: 8.0
        },
        description: 'Voleybol maçı veya antrenmanı',
        epocFactor: 1.08
    },
    {
        id: 'badminton',
        name: 'Badminton',
        category: 'sports',
        icon: '🏸',
        mets: {
            light: 4.5,
            moderate: 5.5,
            vigorous: 7.0
        },
        description: 'Badminton maçı',
        epocFactor: 1.06
    },
    {
        id: 'table_tennis',
        name: 'Masa Tenisi',
        category: 'sports',
        icon: '🏓',
        mets: {
            light: 4.0,
            moderate: 4.0,
            vigorous: 6.0
        },
        description: 'Masa tenisi oynama',
        epocFactor: 1.05
    },
    {
        id: 'boxing',
        name: 'Boks',
        category: 'sports',
        icon: '🥊',
        mets: {
            moderate: 6.0,
            vigorous: 12.8
        },
        description: 'Boks antrenmanı veya sparring',
        epocFactor: 1.15
    },
    {
        id: 'martial_arts',
        name: 'Dövüş Sanatları',
        category: 'sports',
        icon: '🥋',
        mets: {
            moderate: 6.0,
            vigorous: 10.0
        },
        description: 'Karate, taekwondo, judo vb.',
        epocFactor: 1.12
    },
    {
        id: 'golf',
        name: 'Golf',
        category: 'sports',
        icon: '⛳',
        mets: {
            light: 3.5,
            moderate: 4.8
        },
        description: 'Golf oynama (yürüyerek)',
        epocFactor: 1.03
    },

    // FLEXIBILITY & BALANCE
    {
        id: 'yoga',
        name: 'Yoga',
        category: 'flexibility',
        icon: '🧘',
        mets: {
            light: 2.5,
            moderate: 3.0,
            vigorous: 4.0
        },
        description: 'Hatha, vinyasa veya diğer yoga stilleri',
        epocFactor: 1.03
    },
    {
        id: 'pilates',
        name: 'Pilates',
        category: 'flexibility',
        icon: '🤸‍♀️',
        mets: {
            light: 3.0,
            moderate: 4.5,
            vigorous: 6.0
        },
        description: 'Pilates egzersizleri',
        epocFactor: 1.06
    },
    {
        id: 'stretching',
        name: 'Esneme',
        category: 'flexibility',
        icon: '🧘‍♂️',
        mets: {
            light: 2.3,
            moderate: 3.5
        },
        description: 'Statik veya dinamik esneme',
        epocFactor: 1.02
    },
    {
        id: 'tai_chi',
        name: 'Tai Chi',
        category: 'flexibility',
        icon: '🧘‍♀️',
        mets: {
            light: 3.0,
            moderate: 4.0
        },
        description: 'Tai Chi hareketleri',
        epocFactor: 1.03
    },

    // OTHER ACTIVITIES
    {
        id: 'dancing',
        name: 'Dans',
        category: 'other',
        icon: '💃',
        mets: {
            light: 3.0,
            moderate: 4.5,
            vigorous: 7.8
        },
        description: 'Sosyal dans, zumba, salsa vb.',
        epocFactor: 1.08
    },
    {
        id: 'zumba',
        name: 'Zumba',
        category: 'other',
        icon: '💃🕺',
        mets: {
            moderate: 6.5,
            vigorous: 8.5
        },
        description: 'Zumba fitness sınıfı',
        epocFactor: 1.10
    },
    {
        id: 'aerobics',
        name: 'Aerobik',
        category: 'other',
        icon: '🤸',
        mets: {
            light: 4.5,
            moderate: 6.5,
            vigorous: 10.0
        },
        description: 'Aerobik grup dersi',
        epocFactor: 1.10
    },
    {
        id: 'spinning',
        name: 'Spinning',
        category: 'other',
        icon: '🚴‍♀️',
        mets: {
            moderate: 8.5,
            vigorous: 12.0
        },
        description: 'Spinning/indoor cycling sınıfı',
        epocFactor: 1.12
    },
    {
        id: 'climb_stairs_daily',
        name: 'Günlük Merdiven',
        category: 'other',
        icon: '🪜',
        mets: {
            light: 3.5,
            moderate: 4.0
        },
        description: 'Günlük aktiviteler sırasında merdiven',
        epocFactor: 1.03
    },
    {
        id: 'housework',
        name: 'Ev İşleri',
        category: 'other',
        icon: '🧹',
        mets: {
            light: 2.5,
            moderate: 3.5,
            vigorous: 4.5
        },
        description: 'Temizlik, bahçe işleri vb.',
        epocFactor: 1.02
    },
    {
        id: 'gardening',
        name: 'Bahçe İşleri',
        category: 'other',
        icon: '🌱',
        mets: {
            light: 3.0,
            moderate: 4.0,
            vigorous: 5.0
        },
        description: 'Bahçe düzenleme ve bakım',
        epocFactor: 1.03
    },
    {
        id: 'skating',
        name: 'Paten',
        category: 'other',
        icon: '⛸️',
        mets: {
            moderate: 5.5,
            vigorous: 9.0
        },
        description: 'Buz pateni veya inline skate',
        epocFactor: 1.08
    },
    {
        id: 'skiing',
        name: 'Kayak',
        category: 'other',
        icon: '⛷️',
        mets: {
            moderate: 5.3,
            vigorous: 8.0
        },
        description: 'Kayak (alpine veya cross-country)',
        epocFactor: 1.10
    },
    {
        id: 'snowboarding',
        name: 'Snowboard',
        category: 'other',
        icon: '🏂',
        mets: {
            moderate: 5.3,
            vigorous: 8.0
        },
        description: 'Snowboard yapma',
        epocFactor: 1.10
    }
];

export const ACTIVITY_CATEGORIES = {
    cardio: 'Kardio',
    strength: 'Güç Antrenmanı',
    sports: 'Spor',
    flexibility: 'Esneklik & Denge',
    other: 'Diğer'
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
