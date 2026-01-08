import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config';
import { useTranslation } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialSummary {
    id: string;
    title: string;
    difficulty: string;
    duration_minutes: number;
    description: string;
    phases_count: number;
    ai_mistakes_count: number;
}

const localImages: Record<string, any> = {
    biceps_curl: require('../../assets/tutorials/biceps_curl.png'),

};

export default function TutorialListScreen() {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const [tutorials, setTutorials] = useState<TutorialSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTutorials();
    }, []);

    const fetchTutorials = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(API_ENDPOINTS.TUTORIALS);

            if (!response.ok) {
                throw new Error(t('tutorialList.loadError'));
            }

            const data = await response.json();
            setTutorials(data);
        } catch (err: any) {
            console.error('Error fetching tutorials:', err);
            setError(err.message || t('tutorialList.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleTutorialPress = (tutorialId: string) => {
        navigation.navigate('TutorialDetail', { tutorialId });
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner':
                return '#10B981';
            case 'intermediate':
                return '#F59E0B';
            case 'advanced':
                return '#EF4444';
            default:
                return '#64748B';
        }
    };

    const getExerciseIcon = (id: string): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            biceps_curl: 'fitness-outline',
            squat: 'body-outline',
            deadlift: 'barbell-outline',
            shoulder_press: 'arrow-up-circle-outline',
            bench_press: 'bed-outline',
        };
        return iconMap[id] || 'fitness-outline';
    };

    const getTutorialImage = (id: string) => {
        return localImages[id] ?? null;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>{t('tutorialList.loading')}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchTutorials}>
                    <Text style={styles.retryButtonText}>{t('tutorialList.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                <Text style={styles.headerTitle}>{t('tutorialList.headerTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Intro Section */}
            <View style={styles.introSection}>
                <View style={styles.introIcon}>
                    <Ionicons name="school" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.introTitle}>{t('tutorialList.introTitle')}</Text>
                <Text style={styles.introSubtitle}>
                    {t('tutorialList.introSubtitle')}
                </Text>
            </View>

            {/* Tutorial Grid */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.gridContainer}>
                    {tutorials.map((tutorial) => {
                        const imageSource = getTutorialImage(tutorial.id);

                        return (
                            <TouchableOpacity
                                key={tutorial.id}
                                style={styles.tutorialCard}
                                onPress={() => handleTutorialPress(tutorial.id)}
                                activeOpacity={0.9}
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
                                            ]}
                                        >
                                            <Ionicons
                                                name={getExerciseIcon(tutorial.id)}
                                                size={40}
                                                color="#4F46E5"
                                            />
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
                                                {tutorial.duration_minutes} {t('tutorialDetail.min')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>
                                        {tutorial.title}
                                    </Text>
                                    <Text style={styles.cardDescription}>
                                        {tutorial.description}
                                    </Text>

                                    <View style={styles.cardMeta}>
                                        <View
                                            style={[
                                                styles.difficultyBadge,
                                                {
                                                    backgroundColor:
                                                        getDifficultyColor(
                                                            tutorial.difficulty
                                                        ) + '1A',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.difficultyText,
                                                    {
                                                        color: getDifficultyColor(
                                                            tutorial.difficulty
                                                        ),
                                                    },
                                                ]}
                                            >
                                                {tutorial.difficulty}
                                            </Text>
                                        </View>

                                        <View style={styles.metaItem}>
                                            <Ionicons
                                                name="layers-outline"
                                                size={14}
                                                color="#64748B"
                                            />
                                            <Text style={styles.metaText}>
                                                {tutorial.phases_count} {t('tutorialList.phases')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Coming Soon Section */}
                <View style={styles.comingSoonSection}>
                    <Text style={styles.comingSoonTitle}>{t('tutorialList.comingSoon')}</Text>
                    <View style={styles.comingSoonList}>
                        {['Squat', 'Deadlift', 'Shoulder Press'].map((exercise, index) => (
                            <View key={index} style={styles.comingSoonItem}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={18}
                                    color="#94A3B8"
                                />
                                <Text style={styles.comingSoonText}>{exercise}</Text>
                            </View>
                        ))}
                    </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 16,
        color: '#64748B',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
    },
    errorText: {
        marginTop: 16,
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: '#4F46E5',
        borderRadius: 25,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    tutorialCard: {
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
        backgroundColor: '#EEF2FF',
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
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#64748B',
    },
    comingSoonSection: {
        marginTop: 24,
        padding: 20,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
    },
    comingSoonTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    comingSoonList: {
        gap: 8,
    },
    comingSoonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    comingSoonText: {
        fontSize: 14,
        color: '#94A3B8',
    },
});
