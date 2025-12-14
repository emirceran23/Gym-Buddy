// Calories Burned Card Component
// Shows hybrid calories (smartwatch + manual) with breakdown

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { DailyCalorieSummary } from '../types/health';
import { useLanguage } from '../contexts/LanguageContext';

interface CaloriesBurnedCardProps {
    summary: DailyCalorieSummary | null;
    isLoading: boolean;
    onSync: () => void;
    onAddManual: () => void;
    onViewActivities?: () => void;
    calorieGoal?: number;
}

const CaloriesBurnedCard: React.FC<CaloriesBurnedCardProps> = ({
    summary,
    isLoading,
    onSync,
    onAddManual,
    onViewActivities,
    calorieGoal = 500, // default goal
}) => {
    const { t } = useLanguage();
    const totalCalories = summary?.totalCalories || 0;
    const smartwatchCalories = summary?.smartwatchCalories || 0;
    const manualCalories = summary?.manualCalories || 0;
    const progress = calorieGoal > 0 ? Math.min((totalCalories / calorieGoal) * 100, 100) : 0;

    const getDataSourceIcon = () => {
        if (!summary) return '📊';
        switch (summary.dataSource) {
            case 'smartwatch': return '⌚';
            case 'manual': return '✍️';
            case 'hybrid': return '⌚+✍️';
            default: return '📊';
        }
    };

    const getDataSourceText = () => {
        if (!summary) return t('calories.dataSource.noData');
        switch (summary.dataSource) {
            case 'smartwatch': return t('calories.dataSource.smartwatch');
            case 'manual': return t('calories.dataSource.manual');
            case 'hybrid': return t('calories.dataSource.hybrid');
            default: return t('calories.dataSource.unknown');
        }
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.icon}>🔥</Text>
                    <View>
                        <Text style={styles.title}>{t('calories.title')}</Text>
                        <Text style={styles.subtitle}>
                            {getDataSourceIcon()} {getDataSourceText()}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={onSync} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#ff6f00" />
                    ) : (
                        <Text style={styles.syncIcon}>🔄</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Main Calorie Display */}
            <View style={styles.calorieDisplay}>
                <Text style={styles.calorieValue}>{totalCalories}</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
                <Text style={styles.calorieGoal}> / {calorieGoal} {t('dashboard.target').toLowerCase()}</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>

            {/* Breakdown (if hybrid) */}
            {summary?.dataSource === 'hybrid' && (
                <View style={styles.breakdown}>
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownIcon}>⌚</Text>
                            <Text style={styles.breakdownLabel}>{t('common.exercises')}</Text>
                            <Text style={styles.breakdownValue}>{smartwatchCalories} {t('calories.kcal')}</Text>
                        </View>
                        <View style={styles.breakdownDivider} />
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownIcon}>✍️</Text>
                            <Text style={styles.breakdownLabel}>{t('calories.manualActivity')}</Text>
                            <Text style={styles.breakdownValue}>{manualCalories} {t('calories.kcal')}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Manual Activities Count - Clickable */}
            {summary && summary.activities && summary.activities.length > 0 && (
                <TouchableOpacity
                    style={styles.activitiesSummary}
                    onPress={onViewActivities}
                    activeOpacity={0.7}
                >
                    <Text style={styles.activitiesText}>
                        📝 {summary.activities.length} {t('calories.manualActivity').toLowerCase()}
                    </Text>
                    <Text style={styles.viewDetails}>{t('calories.activityHistory')} →</Text>
                </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.addButton} onPress={onAddManual}>
                    <Text style={styles.addButtonText}>+ {t('calories.addManualActivity')}</Text>
                </TouchableOpacity>
            </View>

            {/* Last Sync Time */}
            {summary?.lastSync && (
                <Text style={styles.lastSync}>
                    {t('labels.lastSync')}: {new Date(summary.lastSync).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 32,
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    syncIcon: {
        fontSize: 24,
    },
    calorieDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 16,
    },
    calorieValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ff6f00',
    },
    calorieUnit: {
        fontSize: 18,
        color: '#666',
        marginLeft: 4,
    },
    calorieGoal: {
        fontSize: 14,
        color: '#999',
        marginLeft: 4,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressBarBackground: {
        flex: 1,
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#ff6f00',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ff6f00',
        marginLeft: 8,
        minWidth: 40,
        textAlign: 'right',
    },
    breakdown: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breakdownItem: {
        flex: 1,
        alignItems: 'center',
    },
    breakdownIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    breakdownLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    breakdownDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e0e0e0',
    },
    activitiesSummary: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activitiesText: {
        fontSize: 14,
        color: '#1976d2',
        fontWeight: '500',
    },
    viewDetails: {
        fontSize: 12,
        color: '#1976d2',
        fontWeight: '600',
    },
    actions: {
        marginTop: 8,
    },
    addButton: {
        backgroundColor: '#ff6f00',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    lastSync: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        marginTop: 12,
    },
});

export default CaloriesBurnedCard;
