import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config';
import { useTranslation } from '../contexts/LanguageContext';

interface Meal {
    name: string;
    description: string;
    kcal: number;
    protein_g: number;
    notes: string;
}

interface DayPlan {
    day: string;
    meals: Meal[];
}

interface MealPlan {
    diet_plan: DayPlan[];
    notes: string;
}

const MEAL_PLAN_STORAGE_KEY = 'mealPlan';

export default function MealPlanScreen() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadMealPlan = async () => {
        try {
            setLoading(true);
            setError(null);

            const storedPlan = await AsyncStorage.getItem(MEAL_PLAN_STORAGE_KEY);

            if (storedPlan) {
                console.log('📥 Loading meal plan from storage');
                const parsedPlan = JSON.parse(storedPlan);
                setMealPlan(parsedPlan);
            } else {
                console.log('ℹ️ No stored meal plan found');
                setError(t('mealPlan.noPlanYet'));
            }
        } catch (err: any) {
            console.error('❌ Error loading meal plan:', err);
            setError(t('mealPlan.errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    const generateMealPlan = async () => {
        try {
            setLoading(true);
            setError(null);

            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) {
                Alert.alert(t('common.error'), t('mealPlan.userDataNotFound'));
                navigation.navigate('GoalSetup' as never);
                return;
            }

            const userData = JSON.parse(userDataStr);
            console.log('📤 Sending meal plan request');

            const response = await fetch(API_ENDPOINTS.GENERATE_MEAL_PLAN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    age: userData.age,
                    gender: userData.gender,
                    height: userData.height,
                    weight: userData.weight,
                    targetWeight: userData.targetWeight,
                    weeklyGoal: userData.weeklyChange,
                    goal: userData.goal,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || t('mealPlan.errorCreating'));

            console.log('✅ Meal plan received');
            setMealPlan(data);

            // Save to AsyncStorage
            await AsyncStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Meal plan saved to storage');
        } catch (err: any) {
            console.error('❌ Error:', err);
            setError(err.message || t('mealPlan.errorCreating'));
            Alert.alert(t('common.error'), err.message || t('mealPlan.errorCreating'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMealPlan();
    }, []);

    const toggleDay = (day: string) => setExpandedDay(expandedDay === day ? null : day);
    const getTotalCalories = (meals: Meal[]) => meals.reduce((sum, m) => sum + m.kcal, 0);
    const getTotalProtein = (meals: Meal[]) => meals.reduce((sum, m) => sum + m.protein_g, 0);

    // Helper function for meal info with translations
    const getMealInfo = (mealName: string) => {
        switch (mealName) {
            case 'breakfast':
                return { emoji: '☀️', label: t('mealPlan.breakfast'), color: '#FFF3E0' };
            case 'lunch':
                return { emoji: '🌤️', label: t('mealPlan.lunch'), color: '#E3F2FD' };
            case 'dinner':
                return { emoji: '🌙', label: t('mealPlan.dinner'), color: '#F3E5F5' };
            default:
                return { emoji: '🍎', label: t('mealPlan.snack'), color: '#E8F5E9' };
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1976d2" />
                <Text style={styles.loadingText}>{t('mealPlan.loading')}</Text>
                <Text style={styles.loadingSubtext}>{t('mealPlan.loadingSubtext')}</Text>
            </View>
        );
    }

    if (error && !mealPlan) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#d32f2f" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={generateMealPlan}>
                    <Text style={styles.retryButtonText}>{t('mealPlan.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!mealPlan) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{t('mealPlan.loadingPlan')}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header with gradient background */}
                <View style={styles.headerContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.title}>{t('mealPlan.title')}</Text>
                            <Text style={styles.subtitle}>{t('mealPlan.subtitle')}</Text>
                        </View>
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                        <Ionicons name="information-circle" size={24} color="#4CAF50" />
                    </View>
                    <Text style={styles.infoText}>{mealPlan.notes}</Text>
                </View>

                {/* Weekly Overview Card */}
                <View style={styles.weeklyOverviewCard}>
                    <Text style={styles.weeklyOverviewTitle}>{t('mealPlan.weeklySummary')}</Text>
                    <View style={styles.weeklyStatsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{mealPlan.diet_plan.length}</Text>
                            <Text style={styles.statLabel}>{t('mealPlan.days')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {Math.round(mealPlan.diet_plan.reduce((sum, day) =>
                                    sum + getTotalCalories(day.meals), 0) / mealPlan.diet_plan.length)}
                            </Text>
                            <Text style={styles.statLabel}>{t('mealPlan.avgCalories')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {Math.round(mealPlan.diet_plan.reduce((sum, day) =>
                                    sum + getTotalProtein(day.meals), 0) / mealPlan.diet_plan.length)}g
                            </Text>
                            <Text style={styles.statLabel}>{t('mealPlan.avgProtein')}</Text>
                        </View>
                    </View>
                </View>

                {/* Day Cards */}
                {mealPlan.diet_plan.map((dayPlan, index) => {
                    const isExpanded = expandedDay === dayPlan.day;
                    const totalCals = getTotalCalories(dayPlan.meals);
                    const totalProtein = getTotalProtein(dayPlan.meals);

                    return (
                        <View key={index} style={styles.dayCard}>
                            <TouchableOpacity onPress={() => toggleDay(dayPlan.day)} style={styles.dayHeader}>
                                <View style={styles.dayHeaderLeft}>
                                    <View style={styles.dayNameRow}>
                                        <View style={styles.dayNumberBadge}>
                                            <Text style={styles.dayNumberText}>{index + 1}</Text>
                                        </View>
                                        <Text style={styles.dayName}>{dayPlan.day}</Text>
                                    </View>
                                    <View style={styles.dayStatsRow}>
                                        <View style={styles.miniStatChip}>
                                            <Ionicons name="flame" size={14} color="#FF6B6B" />
                                            <Text style={styles.miniStatText}>{totalCals} kcal</Text>
                                        </View>
                                        <View style={styles.miniStatChip}>
                                            <Ionicons name="fitness" size={14} color="#4ECDC4" />
                                            <Text style={styles.miniStatText}>{Math.round(totalProtein)}g {t('mealPlan.protein')}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}>
                                    <Ionicons name="chevron-down" size={24} color="#1976d2" />
                                </View>
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.mealsContainer}>
                                    {dayPlan.meals.map((meal, mealIndex) => {
                                        const mealInfo = getMealInfo(meal.name);
                                        return (
                                            <View key={mealIndex} style={styles.mealCard}>
                                                <View style={styles.mealHeaderRow}>
                                                    <View style={[styles.mealTypeBadge, { backgroundColor: mealInfo.color }]}>
                                                        <Text style={styles.mealTypeEmoji}>{mealInfo.emoji}</Text>
                                                    </View>
                                                    <View style={styles.mealInfoContainer}>
                                                        <Text style={styles.mealName}>{mealInfo.label}</Text>
                                                        <Text style={styles.mealDescription}>{meal.description}</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.nutritionRow}>
                                                    <View style={styles.nutritionCard}>
                                                        <Ionicons name="flame-outline" size={18} color="#FF6B6B" />
                                                        <View style={styles.nutritionTextContainer}>
                                                            <Text style={styles.nutritionValue}>{meal.kcal}</Text>
                                                            <Text style={styles.nutritionLabel}>kcal</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.nutritionCard}>
                                                        <Ionicons name="fitness-outline" size={18} color="#4ECDC4" />
                                                        <View style={styles.nutritionTextContainer}>
                                                            <Text style={styles.nutritionValue}>{meal.protein_g}g</Text>
                                                            <Text style={styles.nutritionLabel}>{t('mealPlan.protein')}</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                {meal.notes && (
                                                    <View style={styles.mealNotesContainer}>
                                                        <Ionicons name="bulb" size={16} color="#FFA726" />
                                                        <Text style={styles.mealNotes}>{meal.notes}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Regenerate Button */}
                <TouchableOpacity style={styles.regenerateButton} onPress={generateMealPlan}>
                    <Ionicons name="refresh" size={22} color="#fff" />
                    <Text style={styles.regenerateButtonText}>{t('mealPlan.generateNewPlan')}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        padding: 20
    },

    // Header Styles
    headerContainer: {
        backgroundColor: '#1976d2',
        marginHorizontal: -16,
        marginTop: -20,
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
        fontWeight: '500',
    },

    // Loading & Error States
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#37474f',
        marginTop: 20
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#607d8b',
        marginTop: 8
    },
    errorText: {
        fontSize: 16,
        color: '#d32f2f',
        marginTop: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#1976d2',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    // Info Card
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    infoIconContainer: {
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#455a64',
        lineHeight: 20,
    },

    // Weekly Overview Card
    weeklyOverviewCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    weeklyOverviewTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#263238',
        marginBottom: 16,
    },
    weeklyStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1976d2',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#78909c',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e0e0e0',
    },

    // Day Card Styles
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
    },
    dayHeaderLeft: {
        flex: 1,
    },
    dayNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dayNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1976d2',
    },
    dayName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#263238',
    },
    dayStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    miniStatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    miniStatText: {
        fontSize: 13,
        color: '#546e7a',
        fontWeight: '600',
    },
    expandIcon: {
        padding: 4,
    },
    expandIconRotated: {
        transform: [{ rotate: '180deg' }],
    },

    // Meals Container
    mealsContainer: {
        backgroundColor: '#fafafa',
        padding: 12,
        gap: 12,
    },

    // Meal Card Styles
    mealCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    mealHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    mealTypeBadge: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    mealTypeEmoji: {
        fontSize: 24,
    },
    mealInfoContainer: {
        flex: 1,
    },
    mealName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#263238',
        marginBottom: 4,
    },
    mealDescription: {
        fontSize: 14,
        color: '#546e7a',
        lineHeight: 20,
    },

    // Nutrition Info
    nutritionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    nutritionCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    nutritionTextContainer: {
        flex: 1,
    },
    nutritionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#263238',
    },
    nutritionLabel: {
        fontSize: 11,
        color: '#78909c',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Meal Notes
    mealNotesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF8E1',
        padding: 10,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
    },
    mealNotes: {
        flex: 1,
        fontSize: 13,
        color: '#F57C00',
        lineHeight: 18,
        fontStyle: 'italic',
    },

    // Regenerate Button
    regenerateButton: {
        flexDirection: 'row',
        backgroundColor: '#1976d2',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 8,
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    regenerateButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
});
