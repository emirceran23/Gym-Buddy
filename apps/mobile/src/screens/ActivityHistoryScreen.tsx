// Activity History Screen
// Shows detailed table of all manual activities

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getManualActivities, deleteManualActivity, type ManualActivity } from '../services/manualActivityService';
import { ACTIVITY_DATABASE } from '../constants/activityDatabase';

export default function ActivityHistoryScreen() {
    const navigation = useNavigation();
    const [activities, setActivities] = useState<ManualActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await getManualActivities(today);
            setActivities(data);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getActivityInfo = (activityType: string) => {
        return ACTIVITY_DATABASE.find(a => a.id === activityType) || {
            name: activityType,
            icon: '🏋️',
        };
    };

    const getIntensityLabel = (intensity: string) => {
        switch (intensity) {
            case 'light': return { label: 'Hafif', color: '#4CAF50' };
            case 'moderate': return { label: 'Orta', color: '#FF9800' };
            case 'vigorous': return { label: 'Yoğun', color: '#F44336' };
            default: return { label: intensity, color: '#666' };
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Aktiviteyi Sil',
            'Bu aktiviteyi silmek istediğinizden emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        const today = new Date().toISOString().split('T')[0];
                        await deleteManualActivity(today, id);
                        loadActivities();
                    },
                },
            ]
        );
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Geri</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Aktivite Geçmişi</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📊 Bugünün Özeti</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{activities.length}</Text>
                            <Text style={styles.summaryLabel}>Aktivite</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>
                                {activities.reduce((sum, a) => sum + a.duration, 0)}
                            </Text>
                            <Text style={styles.summaryLabel}>Dakika</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>
                                {activities.reduce((sum, a) => sum + a.caloriesBurned, 0)}
                            </Text>
                            <Text style={styles.summaryLabel}>Kalori</Text>
                        </View>
                    </View>
                </View>

                {/* Activities Table */}
                <View style={styles.tableContainer}>
                    <Text style={styles.tableTitle}>📝 Aktivite Detayları</Text>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Aktivite</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Şiddet</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Süre</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Kalori</Text>
                    </View>

                    {/* Table Rows */}
                    {activities.map((activity, index) => {
                        const info = getActivityInfo(activity.activityType);
                        const intensity = getIntensityLabel(activity.intensity);

                        return (
                            <TouchableOpacity
                                key={activity.id}
                                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
                                onLongPress={() => handleDelete(activity.id)}
                                delayLongPress={500}
                            >
                                {/* Activity Column */}
                                <View style={styles.activityColumn}>
                                    <Text style={styles.activityIcon}>{info.icon}</Text>
                                    <View style={styles.activityTextContainer}>
                                        <Text style={styles.activityName} numberOfLines={1}>{info.name}</Text>
                                        <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                                    </View>
                                </View>

                                {/* Intensity Column */}
                                <View style={styles.intensityColumn}>
                                    <View style={[styles.intensityBadge, { backgroundColor: intensity.color + '20' }]}>
                                        <Text style={[styles.intensityText, { color: intensity.color }]}>
                                            {intensity.label}
                                        </Text>
                                    </View>
                                </View>

                                {/* Duration Column */}
                                <View style={styles.durationColumn}>
                                    <Text style={styles.durationText}>{activity.duration} dk</Text>
                                </View>

                                {/* Calories Column */}
                                <View style={styles.calorieColumn}>
                                    <Text style={styles.calorieText}>{activity.caloriesBurned}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {activities.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🏃</Text>
                            <Text style={styles.emptyText}>Henüz aktivite eklenmedi</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.hint}>💡 Silmek için aktiviteye uzun basın</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f8fc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    backText: {
        fontSize: 16,
        color: '#1976d2',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ff6f00',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    tableContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tableTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    tableHeaderCell: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableRowAlt: {
        backgroundColor: '#fafafa',
    },
    activityColumn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityTextContainer: {
        flex: 1,
    },
    intensityColumn: {
        flex: 1,
        alignItems: 'center',
    },
    durationColumn: {
        flex: 0.8,
        alignItems: 'center',
    },
    calorieColumn: {
        flex: 0.8,
        alignItems: 'center',
    },
    durationText: {
        fontSize: 13,
        color: '#333',
    },
    calorieText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ff6f00',
    },
    activityIcon: {
        fontSize: 20,
        marginRight: 6,
    },
    activityName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#333',
    },
    activityTime: {
        fontSize: 10,
        color: '#999',
    },
    intensityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
    },
    intensityText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
});
