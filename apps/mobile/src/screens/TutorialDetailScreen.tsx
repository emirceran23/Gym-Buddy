import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface Phase {
    step: number;
    title: string;
    description: string;
}

interface AIMistake {
    id: string;
    title: string;
    icon: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    correction: string;
    visual_cue_url?: string;
    detection_metric: string;
}

interface Tutorial {
    id: string;
    title: string;
    difficulty: string;
    duration_minutes: number;
    video_hero_url: string;
    thumbnail_url?: string;
    description: string;
    phases: Phase[];
    ai_mistakes: AIMistake[];
    tips?: string[];
}

export default function TutorialDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const videoRef = useRef<Video>(null);

    const tutorialId = route.params?.tutorialId || 'biceps_curl';

    const [tutorial, setTutorial] = useState<Tutorial | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);

    useEffect(() => {
        fetchTutorial();
    }, [tutorialId]);

    const fetchTutorial = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(API_ENDPOINTS.TUTORIAL_DETAIL(tutorialId));

            if (!response.ok) {
                throw new Error('Tutorial not found');
            }

            const data = await response.json();
            setTutorial(data);
        } catch (err: any) {
            console.error('Error fetching tutorial:', err);
            setError(err.message || 'Failed to load tutorial');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzePress = () => {
        navigation.navigate('ExerciseEvaluation', { exerciseId: tutorialId });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#ff4757';
            case 'medium': return '#ffa502';
            case 'low': return '#2ed573';
            default: return '#747d8c';
        }
    };

    const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            'alert-triangle': 'warning-outline',
            'activity': 'pulse-outline',
            'maximize-2': 'expand-outline',
        };
        return iconMap[icon] || 'alert-circle-outline';
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Loading tutorial...</Text>
            </View>
        );
    }

    if (error || !tutorial) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ff4757" />
                <Text style={styles.errorText}>{error || 'Tutorial not found'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchTutorial}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Hero Video Section */}
            <View style={styles.heroContainer}>
                <Video
                    ref={videoRef}
                    source={{ uri: `${API_ENDPOINTS.HEALTH.replace('/api/health', '')}${tutorial.video_hero_url}` }}
                    style={styles.heroVideo}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted
                    shouldPlay
                    onPlaybackStatusUpdate={setVideoStatus}
                />
                <View style={styles.heroOverlay}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Title Overlay */}
                    <View style={styles.titleOverlay}>
                        <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>{tutorial.difficulty}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{tutorial.title}</Text>
                        <Text style={styles.heroDuration}>
                            <Ionicons name="time-outline" size={14} color="#fff" /> {tutorial.duration_minutes} min
                        </Text>
                    </View>
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Description */}
                <Text style={styles.description}>{tutorial.description}</Text>

                {/* Phase Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Exercise Phases</Text>
                    {tutorial.phases.map((phase, index) => (
                        <View key={phase.step} style={styles.phaseItem}>
                            <View style={styles.phaseNumber}>
                                <Text style={styles.phaseNumberText}>{phase.step}</Text>
                            </View>
                            <View style={styles.phaseContent}>
                                <Text style={styles.phaseTitle}>{phase.title}</Text>
                                <Text style={styles.phaseDescription}>{phase.description}</Text>
                            </View>
                            {index < tutorial.phases.length - 1 && (
                                <View style={styles.phaseLine} />
                            )}
                        </View>
                    ))}
                </View>

                {/* AI Watchlist */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🤖 What GymBuddy Watches For</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mistakesContainer}
                    >
                        {tutorial.ai_mistakes.map((mistake) => (
                            <View
                                key={mistake.id}
                                style={[
                                    styles.mistakeCard,
                                    { borderColor: getSeverityColor(mistake.severity) }
                                ]}
                            >
                                <View style={[
                                    styles.mistakeIconContainer,
                                    { backgroundColor: getSeverityColor(mistake.severity) + '20' }
                                ]}>
                                    <Ionicons
                                        name={getIconName(mistake.icon)}
                                        size={28}
                                        color={getSeverityColor(mistake.severity)}
                                    />
                                </View>
                                <Text style={styles.mistakeTitle}>{mistake.title}</Text>
                                <Text style={styles.mistakeDescription} numberOfLines={2}>
                                    {mistake.description}
                                </Text>
                                <View style={styles.mistakeCorrectionBox}>
                                    <Text style={styles.mistakeCorrectionLabel}>How to fix:</Text>
                                    <Text style={styles.mistakeCorrectionText} numberOfLines={3}>
                                        {mistake.correction}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Tips Section */}
                {tutorial.tips && tutorial.tips.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
                        {tutorial.tips.map((tip, index) => (
                            <View key={index} style={styles.tipItem}>
                                <Ionicons name="checkmark-circle" size={20} color="#2ed573" />
                                <Text style={styles.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Spacer for bottom button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={handleAnalyzePress}
                >
                    <Ionicons name="camera-outline" size={24} color="#fff" />
                    <Text style={styles.analyzeButtonText}>Analyze My Form</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0f23',
    },
    loadingText: {
        marginTop: 16,
        color: '#a0a0b0',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0f23',
        padding: 20,
    },
    errorText: {
        marginTop: 16,
        color: '#ff4757',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: '#667eea',
        borderRadius: 25,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    heroContainer: {
        height: 280,
        position: 'relative',
    },
    heroVideo: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 50,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleOverlay: {
        marginBottom: 10,
    },
    difficultyBadge: {
        backgroundColor: '#667eea',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    difficultyText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    heroDuration: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    description: {
        color: '#a0a0b0',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 24,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    phaseItem: {
        flexDirection: 'row',
        marginBottom: 16,
        position: 'relative',
    },
    phaseNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        zIndex: 1,
    },
    phaseNumberText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    phaseLine: {
        position: 'absolute',
        left: 17,
        top: 36,
        bottom: -16,
        width: 2,
        backgroundColor: '#667eea40',
    },
    phaseContent: {
        flex: 1,
    },
    phaseTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    phaseDescription: {
        color: '#a0a0b0',
        fontSize: 14,
        lineHeight: 20,
    },
    mistakesContainer: {
        paddingRight: 20,
    },
    mistakeCard: {
        width: SCREEN_WIDTH * 0.7,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 2,
    },
    mistakeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    mistakeTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    mistakeDescription: {
        color: '#a0a0b0',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    mistakeCorrectionBox: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 8,
        padding: 10,
    },
    mistakeCorrectionLabel: {
        color: '#667eea',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    mistakeCorrectionText: {
        color: '#c0c0d0',
        fontSize: 12,
        lineHeight: 16,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingLeft: 4,
    },
    tipText: {
        color: '#a0a0b0',
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 12,
        flex: 1,
    },
    bottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f0f23',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#1a1a2e',
    },
    analyzeButton: {
        flexDirection: 'row',
        backgroundColor: '#667eea',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    analyzeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
    },
});
