import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessingResult } from '../utils/videoProcessor';

interface VideoResultsModalProps {
    visible: boolean;
    results: ProcessingResult;
    onClose: () => void;
}

export default function VideoResultsModal({
    visible,
    results,
    onClose,
}: VideoResultsModalProps) {
    // Prefer ML-based formScore from backend, fallback to heuristic ratio
    const accuracy = results.formScore != null
        ? Math.round(results.formScore)
        : results.totalReps > 0
            ? Math.round((results.correctReps / results.totalReps) * 100)
            : 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>📊 Detailed Report</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#455a64" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        {/* Accuracy Score */}
                        <View style={styles.scoreCard}>
                            <Text style={styles.scoreLabel}>Form Accuracy</Text>
                            <Text style={styles.scoreValue}>{accuracy}%</Text>
                            <View style={styles.scoreBar}>
                                <View
                                    style={[
                                        styles.scoreBarFill,
                                        {
                                            width: `${accuracy}%`,
                                            backgroundColor: accuracy >= 80 ? '#4caf50' : accuracy >= 60 ? '#ff9800' : '#f44336',
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Left & Right Arm Breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>👈 Left Arm</Text>
                            <View style={styles.armStats}>
                                <StatItem label="Total Reps" value={results.leftReps} />
                                <StatItem
                                    label="Correct"
                                    value={results.leftCorrectReps}
                                    color="#4caf50"
                                />
                                <StatItem
                                    label="Incorrect"
                                    value={results.leftIncorrectReps}
                                    color="#f44336"
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>👉 Right Arm</Text>
                            <View style={styles.armStats}>
                                <StatItem label="Total Reps" value={results.rightReps} />
                                <StatItem
                                    label="Correct"
                                    value={results.rightCorrectReps}
                                    color="#4caf50"
                                />
                                <StatItem
                                    label="Incorrect"
                                    value={results.rightIncorrectReps}
                                    color="#f44336"
                                />
                            </View>
                        </View>

                        {/* Form Feedback */}
                        {results.formFeedback.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>⚠️ Form Issues</Text>
                                {results.formFeedback.map((feedback, index) => (
                                    <View key={index} style={styles.feedbackItem}>
                                        <Ionicons name="alert-circle" size={20} color="#ff9800" />
                                        <Text style={styles.feedbackText}>{feedback}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Recommendations */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>💡 Tips for Improvement</Text>
                            <View style={styles.tipItem}>
                                <Text style={styles.tipText}>
                                    • Keep your elbows close to your body during the movement
                                </Text>
                            </View>
                            <View style={styles.tipItem}>
                                <Text style={styles.tipText}>
                                    • Avoid swinging your torso - use controlled movements
                                </Text>
                            </View>
                            <View style={styles.tipItem}>
                                <Text style={styles.tipText}>
                                    • Fully extend your arms at the bottom of each rep
                                </Text>
                            </View>
                            <View style={styles.tipItem}>
                                <Text style={styles.tipText}>
                                    • Curl all the way up until your forearm touches your bicep
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function StatItem({
    label,
    value,
    color = '#1976d2',
}: {
    label: string;
    value: number;
    color?: string;
}) {
    return (
        <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>{label}</Text>
            <Text style={[styles.statItemValue, { color }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#263238',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    scoreCard: {
        backgroundColor: '#e3f2fd',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreLabel: {
        fontSize: 16,
        color: '#455a64',
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#1976d2',
    },
    scoreBar: {
        width: '100%',
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        marginTop: 12,
        overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#263238',
        marginBottom: 12,
    },
    armStats: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
    },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statItemLabel: {
        fontSize: 15,
        color: '#455a64',
    },
    statItemValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    feedbackItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff3e0',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    feedbackText: {
        fontSize: 14,
        color: '#e65100',
        marginLeft: 10,
        flex: 1,
    },
    tipItem: {
        marginBottom: 8,
    },
    tipText: {
        fontSize: 14,
        color: '#455a64',
        lineHeight: 20,
    },
    doneButton: {
        backgroundColor: '#1976d2',
        marginHorizontal: 20,
        marginVertical: 15,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
