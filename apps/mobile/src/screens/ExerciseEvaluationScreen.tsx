import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import * as Progress from 'react-native-progress';
import VideoResultsModal from '../components/VideoResultsModal';
import SavedResultsSection from '../components/SavedResultsSection';
import { API_URL } from '../config';
import { SavedExerciseResult } from '../services/exerciseResultsService';
import { useTranslation } from '../contexts/LanguageContext';

interface ProcessingResult {
    totalReps: number;
    correctReps: number;
    incorrectReps: number;
    leftReps: number;
    rightReps: number;
    leftCorrectReps: number;
    rightCorrectReps: number;
    leftIncorrectReps: number;
    rightIncorrectReps: number;
    formFeedback: string[];
    formScore?: number;
    formLabel?: string;
    timeline: any[];
    duration: number;
    annotatedVideoUrl?: string;
}

interface ProcessingProgress {
    current: number;
    total: number;
    percentage: number;
    status: string;
}

export default function ExerciseEvaluationScreen() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'analyze' | 'saved'>('analyze');
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<ProcessingProgress | null>(null);
    const [results, setResults] = useState<ProcessingResult | null>(null);
    const [showResultsModal, setShowResultsModal] = useState(false);

    const pickVideo = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('exerciseEval.permissionRequired'), t('exerciseEval.grantAccess'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setVideoUri(result.assets[0].uri);
                setResults(null);
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert(t('common.error'), t('exerciseEval.failedToPickVideo'));
        }
    };

    const processVideo = async () => {
        if (!videoUri) {
            Alert.alert(t('exerciseEval.noVideo'), t('exerciseEval.selectVideoFirst'));
            return;
        }

        try {
            setIsProcessing(true);
            setProgress({ current: 0, total: 100, percentage: 0, status: 'Starting...' });

            const { VideoProcessor } = await import('../utils/videoProcessor');
            const processor = new VideoProcessor((prog) => setProgress(prog));
            const result = await processor.processVideo(videoUri);

            console.log('Full results:', result);
            console.log('Annotated video URL:', result.annotatedVideoUrl);

            setResults(result);
            setIsProcessing(false);
            setShowResultsModal(true);
        } catch (error) {
            console.error('Error processing video:', error);
            Alert.alert(t('exerciseEval.processingError'), t('exerciseEval.failedToAnalyze'));
            setIsProcessing(false);
        }
    };

    const resetVideo = () => {
        setVideoUri(null);
        setResults(null);
        setProgress(null);
    };

    const handleSavedResultPress = (result: SavedExerciseResult) => {
        // Convert SavedExerciseResult to ProcessingResult format
        const processingResult: ProcessingResult = {
            ...result.results,
            annotatedVideoUrl: result.annotatedVideoUrl,
        };
        setResults(processingResult);
        setShowResultsModal(true);
    };

    return (
        <View style={styles.container}>
            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'analyze' && styles.activeTab]}
                    onPress={() => setActiveTab('analyze')}
                >
                    <Ionicons
                        name="videocam"
                        size={20}
                        color={activeTab === 'analyze' ? '#1976d2' : '#607d8b'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'analyze' && styles.activeTabText,
                        ]}
                    >
                        {t('exerciseEval.analyze')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
                    onPress={() => setActiveTab('saved')}
                >
                    <Ionicons
                        name="time"
                        size={20}
                        color={activeTab === 'saved' ? '#1976d2' : '#607d8b'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'saved' && styles.activeTabText,
                        ]}
                    >
                        {t('exerciseEval.savedResults')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'analyze' ? (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Ionicons name="fitness" size={40} color="#1976d2" />
                        <Text style={styles.title}>{t('exerciseEval.title')}</Text>
                        <Text style={styles.subtitle}>{t('exerciseEval.subtitle')}</Text>
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>{t('exerciseEval.howItWorks')}</Text>
                        <Text style={styles.infoText}>{t('exerciseEval.step1')}</Text>
                        <Text style={styles.infoText}>{t('exerciseEval.step2')}</Text>
                        <Text style={styles.infoText}>{t('exerciseEval.step3')}</Text>
                    </View>

                    {!videoUri ? (
                        <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                            <Ionicons name="cloud-upload-outline" size={50} color="#1976d2" />
                            <Text style={styles.uploadText}>{t('exerciseEval.uploadVideo')}</Text>
                            <Text style={styles.uploadSubtext}>{t('exerciseEval.tapToSelect')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.videoSection}>
                            <Video
                                source={{ uri: videoUri }}
                                style={styles.video}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping
                            />
                            <View style={styles.videoActions}>
                                <TouchableOpacity style={styles.actionButton} onPress={resetVideo}>
                                    <Ionicons name="close-circle-outline" size={24} color="#d32f2f" />
                                    <Text style={styles.actionText}>{t('exerciseEval.changeVideo')}</Text>
                                </TouchableOpacity>

                                {!isProcessing && !results && (
                                    <TouchableOpacity style={styles.processButton} onPress={processVideo}>
                                        <Ionicons name="play-circle-outline" size={24} color="#fff" />
                                        <Text style={styles.processButtonText}>{t('exerciseEval.analyzeVideo')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {isProcessing && progress && (
                        <View style={styles.processingCard}>
                            <ActivityIndicator size="large" color="#1976d2" />
                            <Text style={styles.processingText}>{progress.status}</Text>
                            <Progress.Bar
                                progress={progress.percentage / 100}
                                width={300}
                                color="#1976d2"
                                unfilledColor="#e0e0e0"
                                borderWidth={0}
                                height={12}
                                style={{ marginTop: 10, borderRadius: 10 }}
                            />
                            <Text style={styles.progressPercent}>{Math.round(progress.percentage)}%</Text>
                        </View>
                    )}

                    {results && !isProcessing && (
                        <View style={styles.resultsCard}>
                            <Text style={styles.resultsTitle}>{t('exerciseEval.analysisComplete')}</Text>
                            <View style={styles.statRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{results.totalReps}</Text>
                                    <Text style={styles.statLabel}>{t('exerciseEval.totalReps')}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: '#4caf50' }]}>{results.correctReps}</Text>
                                    <Text style={styles.statLabel}>{t('exerciseEval.correct')}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: '#f44336' }]}>{results.incorrectReps}</Text>
                                    <Text style={styles.statLabel}>{t('exerciseEval.incorrect')}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.detailsButton} onPress={() => setShowResultsModal(true)}>
                                <Text style={styles.detailsButtonText}>{t('exerciseEval.viewDetailedReport')}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </TouchableOpacity>

                            {results.annotatedVideoUrl && (
                                <View style={styles.videoContainer}>
                                    <Text style={styles.annotatedVideoTitle}>{t('exerciseEval.watchAIAnalysis')}</Text>
                                    <Text style={styles.debugText}>
                                        Video URL: {API_URL + results.annotatedVideoUrl}
                                    </Text>
                                    <Video
                                        source={{ uri: API_URL + results.annotatedVideoUrl }}
                                        style={styles.annotatedVideo}
                                        useNativeControls
                                        resizeMode={ResizeMode.CONTAIN}
                                        onError={(error) => {
                                            console.error('Video error:', error);
                                            Alert.alert(t('exerciseEval.videoError'), t('exerciseEval.failedToLoadVideo'));
                                        }}
                                        onLoad={() => console.log('Video loaded successfully')}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            ) : (
                <SavedResultsSection onResultPress={handleSavedResultPress} />
            )}

            {results && (
                <VideoResultsModal
                    visible={showResultsModal}
                    results={results}
                    onClose={() => setShowResultsModal(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f8fc', paddingTop: 40 },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#1976d2',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#607d8b',
    },
    activeTabText: {
        color: '#1976d2',
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
    header: { alignItems: 'center', marginBottom: 20, paddingTop: 20 },
    title: { fontSize: 28, fontWeight: '700', color: '#1976d2', marginTop: 10 },
    subtitle: { fontSize: 16, color: '#455a64', marginTop: 5 },
    infoCard: { width: '100%', backgroundColor: '#e3f2fd', borderRadius: 16, padding: 18, marginBottom: 20 },
    infoTitle: { fontSize: 17, fontWeight: '600', color: '#0d47a1', marginBottom: 10 },
    infoText: { fontSize: 14, color: '#455a64', marginVertical: 3 },
    uploadButton: { width: '100%', height: 250, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#1976d2', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    uploadText: { fontSize: 20, fontWeight: '600', color: '#1976d2', marginTop: 12 },
    uploadSubtext: { fontSize: 14, color: '#607d8b', marginTop: 5 },
    videoSection: { width: '100%', marginBottom: 20 },
    video: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 16 },
    videoActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#d32f2f' },
    actionText: { fontSize: 14, fontWeight: '600', color: '#d32f2f', marginLeft: 6 },
    processButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976d2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
    processButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 8 },
    processingCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 20 },
    processingText: { fontSize: 16, color: '#455a64', marginTop: 12, marginBottom: 8 },
    progressPercent: { fontSize: 14, color: '#1976d2', fontWeight: '600', marginTop: 8 },
    resultsCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22, marginTop: 20 },
    resultsTitle: { fontSize: 20, fontWeight: '700', color: '#263238', textAlign: 'center', marginBottom: 20 },
    statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    statBox: { alignItems: 'center' },
    statNumber: { fontSize: 36, fontWeight: '800', color: '#1976d2' },
    statLabel: { fontSize: 13, color: '#607d8b', marginTop: 4 },
    detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1976d2', paddingVertical: 14, borderRadius: 12 },
    detailsButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', marginRight: 6 },
    videoContainer: { marginTop: 20 },
    annotatedVideoTitle: { fontSize: 18, fontWeight: '700', color: '#263238', textAlign: 'center', marginBottom: 8 },
    debugText: { fontSize: 12, color: '#666', marginBottom: 8, textAlign: 'center', paddingHorizontal: 10 },
    annotatedVideo: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 16, marginTop: 8 },
});
