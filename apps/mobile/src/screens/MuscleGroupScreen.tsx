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
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MuscleGroup {
    id: string;
    nameKey: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    exerciseCount: number;
    descriptionKey: string;
}

const muscleGroups: MuscleGroup[] = [
    {
        id: 'biceps',
        nameKey: 'muscleGroups.biceps',
        icon: 'fitness-outline',
        color: '#4F46E5',
        exerciseCount: 2,
        descriptionKey: 'muscleGroups.bicepsDesc',
    },
    {
        id: 'chest',
        nameKey: 'muscleGroups.chest',
        icon: 'body-outline',
        color: '#EF4444',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.chestDesc',
    },
    {
        id: 'calves',
        nameKey: 'muscleGroups.calves',
        icon: 'walk-outline',
        color: '#10B981',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.calvesDesc',
    },
    {
        id: 'shoulders',
        nameKey: 'muscleGroups.shoulders',
        icon: 'arrow-up-circle-outline',
        color: '#F59E0B',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.shouldersDesc',
    },
    {
        id: 'back',
        nameKey: 'muscleGroups.back',
        icon: 'shield-outline',
        color: '#8B5CF6',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.backDesc',
    },
    {
        id: 'legs',
        nameKey: 'muscleGroups.legs',
        icon: 'footsteps-outline',
        color: '#EC4899',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.legsDesc',
    },
    {
        id: 'abs',
        nameKey: 'muscleGroups.abs',
        icon: 'grid-outline',
        color: '#06B6D4',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.absDesc',
    },
    {
        id: 'triceps',
        nameKey: 'muscleGroups.triceps',
        icon: 'barbell-outline',
        color: '#84CC16',
        exerciseCount: 0,
        descriptionKey: 'muscleGroups.tricepsDesc',
    },
];

// Local images mapping for muscle groups
const muscleGroupImages: Record<string, any> = {
    biceps: require('../../assets/images/biceps.webp'),
};

export default function MuscleGroupScreen() {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    const handleMuscleGroupPress = (muscleGroup: MuscleGroup) => {
        if (muscleGroup.exerciseCount > 0) {
            navigation.navigate('ExerciseList', {
                muscleGroupId: muscleGroup.id,
                muscleGroupName: t(muscleGroup.nameKey)
            });
        }
    };

    const getMuscleGroupImage = (id: string) => {
        return muscleGroupImages[id] ?? null;
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
                <Text style={styles.headerTitle}>{t('muscleGroups.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Intro Section */}
            <View style={styles.introSection}>
                <View style={styles.introIcon}>
                    <Ionicons name="body" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.introTitle}>{t('muscleGroups.selectTarget')}</Text>
                <Text style={styles.introSubtitle}>
                    {t('muscleGroups.selectDescription')}
                </Text>
            </View>

            {/* Muscle Group Grid */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.gridContainer}>
                    {muscleGroups.map((group) => {
                        const isAvailable = group.exerciseCount > 0;
                        const imageSource = getMuscleGroupImage(group.id);

                        return (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.muscleCard,
                                    !isAvailable && styles.muscleCardDisabled,
                                ]}
                                onPress={() => handleMuscleGroupPress(group)}
                                activeOpacity={isAvailable ? 0.9 : 1}
                            >
                                {/* Image Section */}
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
                                                { backgroundColor: isAvailable ? group.color + '20' : '#E2E8F0' },
                                            ]}
                                        >
                                            <Ionicons
                                                name={group.icon}
                                                size={48}
                                                color={isAvailable ? group.color : '#94A3B8'}
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

                                    {/* Exercise Count Badge */}
                                    {isAvailable && (
                                        <View style={styles.cardImageOverlayBottom}>
                                            <View style={[styles.overlayPill, { backgroundColor: group.color }]}>
                                                <Ionicons
                                                    name="barbell"
                                                    size={14}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={styles.overlayPillText}>
                                                    {group.exerciseCount} {t('common.exercises')}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Content Section */}
                                <View style={styles.cardContent}>
                                    <Text style={[
                                        styles.cardTitle,
                                        !isAvailable && styles.cardTitleDisabled,
                                    ]}>
                                        {t(group.nameKey)}
                                    </Text>
                                    <Text style={styles.cardDescription}>
                                        {t(group.descriptionKey)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

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
        backgroundColor: '#EEF2FF',
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
    muscleCard: {
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
    muscleCardDisabled: {
        opacity: 0.85,
    },
    cardImageWrapper: {
        width: '100%',
        height: 120,
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
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
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
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    cardTitleDisabled: {
        color: '#94A3B8',
    },
    cardDescription: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
});
