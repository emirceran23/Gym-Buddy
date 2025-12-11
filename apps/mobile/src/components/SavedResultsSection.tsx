import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    fetchExerciseResults,
    deleteExerciseResult,
    SavedExerciseResult,
} from '../services/exerciseResultsService';

interface SavedResultsSectionProps {
    onResultPress: (result: SavedExerciseResult) => void;
}

export default function SavedResultsSection({ onResultPress }: SavedResultsSectionProps) {
    const [results, setResults] = useState<SavedExerciseResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        try {
            setLoading(true);
            const data = await fetchExerciseResults();
            setResults(data);
        } catch (error) {
            console.error('Error loading results:', error);
            Alert.alert('Error', 'Failed to load saved results');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadResults();
    };

    const handleDelete = (resultId: string) => {
        Alert.alert(
            'Delete Result',
            'Are you sure you want to delete this result?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteExerciseResult(resultId);
                            // Refresh the list
                            loadResults();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete result');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return timestamp;
        }
    };

    const renderResultCard = ({ item }: { item: SavedExerciseResult }) => {
        // Prefer ML-based formScore, fallback to heuristic ratio
        const accuracy = item.results.formScore != null
            ? Math.round(item.results.formScore)
            : item.results.totalReps > 0
                ? Math.round((item.results.correctReps / item.results.totalReps) * 100)
                : 0;

        return (
            <TouchableOpacity
                style={styles.resultCard}
                onPress={() => onResultPress(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={16} color="#1976d2" />
                        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={styles.deleteButton}
                    >
                        <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                    </TouchableOpacity>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.results.totalReps}</Text>
                        <Text style={styles.statLabel}>Total Reps</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#4caf50' }]}>
                            {item.results.correctReps}
                        </Text>
                        <Text style={styles.statLabel}>Correct</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#f44336' }]}>
                            {item.results.incorrectReps}
                        </Text>
                        <Text style={styles.statLabel}>Incorrect</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#1976d2' }]}>
                            {accuracy}%
                        </Text>
                        <Text style={styles.statLabel}>Accuracy</Text>
                    </View>
                </View>

                {item.hasAnnotatedVideo && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={14} color="#1976d2" />
                        <Text style={styles.videoBadgeText}>Has Video</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (results.length === 0 && !loading) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="fitness-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No saved results yet</Text>
                <Text style={styles.emptySubtext}>
                    Analyze some videos to see your history here
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="time-outline" size={24} color="#1976d2" />
                <Text style={styles.headerTitle}>Saved Results</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color="#1976d2" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={results}
                renderItem={renderResultCard}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f8fc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#263238',
        marginLeft: 10,
        flex: 1,
    },
    refreshButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    resultCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 13,
        color: '#607d8b',
        marginLeft: 6,
    },
    deleteButton: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#263238',
    },
    statLabel: {
        fontSize: 11,
        color: '#607d8b',
        marginTop: 4,
    },
    videoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    videoBadgeText: {
        fontSize: 11,
        color: '#1976d2',
        fontWeight: '600',
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#455a64',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#90a4ae',
        marginTop: 8,
        textAlign: 'center',
    },
});
