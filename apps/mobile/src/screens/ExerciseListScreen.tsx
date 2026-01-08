import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Exercise {
    id: string;
    nameKey: string;
    tutorialId: string;
    difficultyKey: string;
    duration_minutes: number;
    descriptionKey: string;
}

// Exercise data organized by muscle group with translation keys
const exercisesByMuscleGroup: Record<string, Exercise[]> = {
    biceps: [
        {
            id: 'biceps_curl',
            nameKey: 'exercises.bicepsCurl',
            tutorialId: 'biceps_curl',
            difficultyKey: 'difficulty.beginner',
            duration_minutes: 3,
            descriptionKey: 'exercises.bicepsCurlDesc',
        },
        {
            id: 'hammer_curl',
            nameKey: 'exercises.hammerCurl',
            tutorialId: 'hammer_curl',
            difficultyKey: 'difficulty.beginner',
            duration_minutes: 3,
            descriptionKey: 'exercises.hammerCurlDesc',
        },
    ],
    chest: [],
    calves: [],
    shoulders: [],
    back: [],
    legs: [],
    abs: [],
    triceps: [],
};

// Local images mapping
const localImages: Record<string, any> = {
    biceps_curl: require('../../assets/tutorials/biceps_curl.png'),
};

// Muscle group colors
const muscleGroupColors: Record<string, string> = {
    biceps: '#4F46E5',
    chest: '#EF4444',
    calves: '#10B981',
    shoulders: '#F59E0B',
    back: '#8B5CF6',
    legs: '#EC4899',
    abs: '#06B6D4',
    triceps: '#84CC16',
};

// Muscle group icons
const muscleGroupIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    biceps: 'fitness-outline',
    chest: 'body-outline',
    calves: 'walk-outline',
    shoulders: 'arrow-up-circle-outline',
    back: 'shield-outline',
    legs: 'footsteps-outline',
    abs: 'grid-outline',
    triceps: 'barbell-outline',
};

// Muscle group translation keys
const muscleGroupTranslationKeys: Record<string, string> = {
    biceps: 'muscleGroups.biceps',
    chest: 'muscleGroups.chest',
    calves: 'muscleGroups.calves',
    shoulders: 'muscleGroups.shoulders',
    back: 'muscleGroups.back',
    legs: 'muscleGroups.legs',
    abs: 'muscleGroups.abs',
    triceps: 'muscleGroups.triceps',
};

export default function ExerciseListScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { t } = useTranslation();

    const muscleGroupId = route.params?.muscleGroupId || 'biceps';
    const muscleGroupName = t(muscleGroupTranslationKeys[muscleGroupId] || 'muscleGroups.biceps');

    const exercises = exercisesByMuscleGroup[muscleGroupId] || [];
    const primaryColor = muscleGroupColors[muscleGroupId] || '#4F46E5';
    const muscleIcon = muscleGroupIcons[muscleGroupId] || 'fitness-outline';

    const handleExercisePress = (exercise: Exercise) => {
        navigation.navigate('TutorialDetail', { tutorialId: exercise.tutorialId });
    };

    const getDifficultyColor = (difficultyKey: string) => {
        if (difficultyKey.includes('beginner')) return '#10B981';
        if (difficultyKey.includes('intermediate')) return '#F59E0B';
        if (difficultyKey.includes('advanced')) return '#EF4444';
        return '#64748B';
    };

    const getExerciseImage = (id: string) => {
        return localImages[id] ?? null;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('exerciseList.title', { muscle: muscleGroupName })}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Intro Section */}
            <View style={styles.introSection}>
                <View style={[styles.introIcon, { backgroundColor: primaryColor + '20' }]}>
                    <Ionicons name={muscleIcon} size={32} color={primaryColor} />
                </View>
                <Text style={styles.introTitle}>
                    {t('exerciseList.movements', { muscle: muscleGroupName })}
                </Text>
                <Text style={styles.introSubtitle}>
                    {t('exerciseList.selectExercise')}
                </Text>
            </View>

            {/* Exercise Grid */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.gridContainer}>
                    {exercises.map((exercise) => {
                        const imageSource = getExerciseImage(exercise.id);
                        const isAvailable = exercise.tutorialId === 'biceps_curl';

                        return (
                            <TouchableOpacity
                                key={exercise.id}
                                style={[
                                    styles.exerciseCard,
                                    !isAvailable && styles.exerciseCardDisabled,
                                ]}
                                onPress={() => isAvailable && handleExercisePress(exercise)}
                                activeOpacity={isAvailable ? 0.9 : 1}
                            >
                                <View style={styles.cardImageWrapper}>
                                    {imageSource ? (
                                        <Image
                                            source={imageSource}
                                            style={styles.cardImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                styles.cardImage,
                                                styles.cardImagePlaceholder,
                                                { backgroundColor: primaryColor + '20' },
                                            ]}
                                        >
                                            <Ionicons
                                                name={muscleIcon}
                                                size={40}
                                                color={primaryColor}
                                            />
                                        </View>
                                    )}

                                    {/* Coming Soon Overlay */}
                                    {!isAvailable && (
                                        <View style={styles.comingSoonOverlay}>
                                            <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
                                            <Text style={styles.comingSoonOverlayText}>
                                                {t('common.comingSoon')}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Overlay bottom-right: play icon + duration */}
                                    <View style={styles.cardImageOverlayBottom}>
                                        <View style={styles.overlayPill}>
                                            <Ionicons
                                                name="play-circle"
                                                size={16}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.overlayPillText}>
                                                {exercise.duration_minutes} {t('time.min')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardContent}>
                                    <Text style={[
                                        styles.cardTitle,
                                        !isAvailable && styles.cardTitleDisabled,
                                    ]}>
                                        {t(exercise.nameKey)}
                                    </Text>
                                    <Text style={styles.cardDescription}>
                                        {t(exercise.descriptionKey)}
                                    </Text>

                                    <View style={styles.cardMeta}>
                                        <View
                                            style={[
                                                styles.difficultyBadge,
                                                {
                                                    backgroundColor:
                                                        getDifficultyColor(
                                                            exercise.difficultyKey
                                                        ) + '1A',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.difficultyText,
                                                    {
                                                        color: getDifficultyColor(
                                                            exercise.difficultyKey
                                                        ),
                                                    },
                                                ]}
                                            >
                                                {t(exercise.difficultyKey)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Coming Soon Section */}
                {exercises.length === 0 && (
                    <View style={styles.emptySection}>
                        <Ionicons name="construct-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyTitle}>
                            {t('exerciseList.exercisesBeingPrepared')}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {t('exerciseList.exercisesComingSoon')}
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const CARD_HORIZONTAL_PADDING = 12;
const CARD_GAP = 12;
const CARD_WIDTH =
    (SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    introSection: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    introIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    introTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
    },
    introSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: CARD_HORIZONTAL_PADDING,
        paddingTop: 16,
        paddingBottom: 24,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    exerciseCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: CARD_GAP,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    exerciseCardDisabled: {
        opacity: 0.85,
    },
    cardImageWrapper: {
        width: '100%',
        height: 160,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonOverlayText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    cardImageOverlayBottom: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    overlayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(15,23,42,0.65)',
        gap: 4,
    },
    overlayPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    cardContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    cardTitleDisabled: {
        color: '#64748B',
    },
    cardDescription: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
        marginBottom: 10,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    difficultyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
    },
    difficultyText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    emptySection: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
});
