import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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

interface MealPlanItem {
    id: string;
    name: string;
    createdAt: string;
    preferences: string;
    diet_plan: DayPlan[];
    notes: string;
}

const MEAL_PLANS_STORAGE_KEY = 'mealPlans';

export default function MealPlanScreen() {
    const navigation = useNavigation();
    const { t } = useTranslation();

    // Tab state
    const [activeTab, setActiveTab] = useState<'myPlans' | 'createNew'>('myPlans');

    // Plans state
    const [savedPlans, setSavedPlans] = useState<MealPlanItem[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<MealPlanItem | null>(null);

    // Create new plan state
    const [loading, setLoading] = useState(false);
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [showPreferencesInput, setShowPreferencesInput] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const preferencesInputRef = React.useRef<TextInput>(null);
    const scrollViewRef = React.useRef<ScrollView>(null);

    // Plan naming state
    const [showNameModal, setShowNameModal] = useState(false);
    const [planName, setPlanName] = useState('');
    const [pendingPlan, setPendingPlan] = useState<any>(null);

    // Rename state
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renamingPlanId, setRenamingPlanId] = useState<string | null>(null);
    const [newPlanName, setNewPlanName] = useState('');

    useEffect(() => {
        loadPlans();
        migrateOldPlan();
    }, []);

    const migrateOldPlan = async () => {
        try {
            const oldPlan = await AsyncStorage.getItem('mealPlan');
            if (oldPlan) {
                const parsed = JSON.parse(oldPlan);
                const migrated: MealPlanItem = {
                    id: Date.now().toString(),
                    name: 'My Meal Plan',
                    createdAt: new Date().toISOString(),
                    preferences: parsed.dietaryRestrictions || '',
                    diet_plan: parsed.diet_plan,
                    notes: parsed.notes
                };
                const existingPlans = await loadPlansFromStorage();
                await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify([...existingPlans, migrated]));
                await AsyncStorage.removeItem('mealPlan');
                loadPlans();
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    };

    const loadPlansFromStorage = async (): Promise<MealPlanItem[]> => {
        try {
            const plansJson = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
            return plansJson ? JSON.parse(plansJson) : [];
        } catch (error) {
            console.error('Error loading plans:', error);
            return [];
        }
    };

    const loadPlans = async () => {
        const plans = await loadPlansFromStorage();
        setSavedPlans(plans);
        if (plans.length > 0 && !selectedPlan) {
            setSelectedPlan(plans[0]);
        }
    };

    const savePlan = async () => {
        if (!pendingPlan) return;

        const newPlan: MealPlanItem = {
            id: Date.now().toString(),
            name: planName.trim() || `Meal Plan - ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            preferences: dietaryRestrictions.trim(),
            diet_plan: pendingPlan.diet_plan,
            notes: pendingPlan.notes
        };

        const updatedPlans = [...savedPlans, newPlan];
        await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
        setSavedPlans(updatedPlans);
        setSelectedPlan(newPlan);

        // Reset state
        setPendingPlan(null);
        setPlanName('');
        setShowNameModal(false);
        setActiveTab('myPlans');
    };

    const deletePlan = async (planId: string) => {
        Alert.alert(
            t('mealPlan.deletePlan'),
            t('mealPlan.deleteConfirm'),
            [
                { text: t('mealPlan.cancel'), style: 'cancel' },
                {
                    text: t('mealPlan.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const updatedPlans = savedPlans.filter(p => p.id !== planId);
                        await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
                        setSavedPlans(updatedPlans);
                        if (selectedPlan?.id === planId) {
                            setSelectedPlan(updatedPlans[0] || null);
                        }
                    }
                }
            ]
        );
    };

    const startRenamePlan = (planId: string) => {
        const plan = savedPlans.find(p => p.id === planId);
        if (plan) {
            setRenamingPlanId(planId);
            setNewPlanName(plan.name);
            setShowRenameModal(true);
        }
    };

    const renamePlan = async () => {
        if (!renamingPlanId || !newPlanName.trim()) return;

        const updatedPlans = savedPlans.map(p =>
            p.id === renamingPlanId ? { ...p, name: newPlanName.trim() } : p
        );
        await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
        setSavedPlans(updatedPlans);
        if (selectedPlan?.id === renamingPlanId) {
            setSelectedPlan({ ...selectedPlan, name: newPlanName.trim() });
        }

        setShowRenameModal(false);
        setRenamingPlanId(null);
        setNewPlanName('');
    };

    const generateMealPlan = async () => {
        try {
            setLoading(true);

            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) {
                Alert.alert(t('common.error'), t('mealPlan.userDataNotFound'));
                navigation.navigate('GoalSetup' as never);
                return;
            }

            const userData = JSON.parse(userDataStr);
            console.log('📤 Sending meal plan request');
            if (dietaryRestrictions.trim()) {
                console.log('🥗 Dietary restrictions:', dietaryRestrictions);
            }

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
                    dietaryRestrictions: dietaryRestrictions.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate meal plan');
            }

            console.log('✅ Meal plan received');

            // Show naming modal
            setPendingPlan(data);
            setShowNameModal(true);

        } catch (err: any) {
            console.error('❌ Error generating meal plan:', err);
            Alert.alert(t('common.error'), err.message || t('mealPlan.errorCreating'));
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: string) => setExpandedDay(expandedDay === day ? null : day);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Render functions
    const renderMyPlansTab = () => {
        if (savedPlans.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="restaurant-outline" size={64} color="#10B981" />
                    <Text style={styles.emptyTitle}>{t('mealPlan.noPlansYet')}</Text>
                    <Text style={styles.emptySubtitle}>{t('mealPlan.createFirstPlan')}</Text>
                </View>
            );
        }

        return (
            <View style={{ flex: 1 }}>
                <ScrollView style={styles.plansListContainer} showsVerticalScrollIndicator={false}>
                    {savedPlans.map((plan) => (
                        <TouchableOpacity
                            key={plan.id}
                            style={[
                                styles.planCard,
                                selectedPlan?.id === plan.id && styles.planCardSelected
                            ]}
                            onPress={() => setSelectedPlan(plan)}
                        >
                            <View style={styles.planCardHeader}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <View style={styles.planActions}>
                                    <TouchableOpacity onPress={() => startRenamePlan(plan.id)} style={styles.actionButton}>
                                        <Ionicons name="pencil" size={20} color="#666" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => deletePlan(plan.id)} style={styles.actionButton}>
                                        <Ionicons name="trash" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.planDate}>{t('mealPlan.createdOn', { date: formatDate(plan.createdAt) })}</Text>
                        </TouchableOpacity>
                    ))}

                    {selectedPlan && (
                        <View style={styles.selectedPlanDetails}>
                            <Text style={styles.detailsTitle}>🍽️ {selectedPlan.name}</Text>

                            {selectedPlan.preferences && (
                                <View style={styles.preferencesDisplay}>
                                    <Text style={styles.preferencesLabel}>{t('mealPlan.currentPreferences')}</Text>
                                    <Text style={styles.preferencesText}>{selectedPlan.preferences}</Text>
                                </View>
                            )}



                            {selectedPlan.diet_plan.map((dayPlan, index) => (
                                <View key={index} style={styles.dayCard}>
                                    <TouchableOpacity
                                        style={styles.dayHeader}
                                        onPress={() => toggleDay(dayPlan.day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.dayName}>{dayPlan.day}</Text>
                                        <Ionicons
                                            name={expandedDay === dayPlan.day ? 'chevron-up' : 'chevron-down'}
                                            size={24}
                                            color="#666"
                                        />
                                    </TouchableOpacity>

                                    {expandedDay === dayPlan.day && (
                                        <View style={styles.mealsContainer}>
                                            {dayPlan.meals.map((meal, mIndex) => (
                                                <View key={mIndex} style={styles.mealItem}>
                                                    <View style={styles.mealHeader}>
                                                        <View style={styles.mealTitleRow}>
                                                            <Ionicons
                                                                name={meal.name.toLowerCase().includes('snack') ? 'cafe-outline' : 'restaurant-outline'}
                                                                size={18}
                                                                color="#10B981"
                                                                style={{ marginRight: 8 }}
                                                            />
                                                            <Text style={styles.mealName}>{meal.name}</Text>
                                                        </View>
                                                        <Text style={styles.mealCalories}>
                                                            {meal.kcal} kcal • {meal.protein_g}g protein
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.mealDescription}>{meal.description}</Text>
                                                    {meal.notes && (
                                                        <Text style={styles.mealNotes}>💡 {meal.notes}</Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {selectedPlan && selectedPlan.notes && (
                    <View style={styles.stickyNotesContainer}>
                        <View style={styles.notesHeader}>
                            <Ionicons name="information-circle" size={20} color="#2196F3" />
                            <Text style={styles.notesTitle}>Notes</Text>
                        </View>
                        <ScrollView style={{ maxHeight: 100 }}>
                            <Text style={styles.notesText}>{selectedPlan.notes}</Text>
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    const renderCreateNewTab = () => {
        if (loading) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>{t('mealPlan.loading')}</Text>
                </View>
            );
        }

        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.createNewContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 200 }}
                >
                    <View style={styles.createNewContent}>
                        {!showPreferencesInput && (
                            <>
                                <Ionicons name="nutrition" size={64} color="#10B981" />
                                <Text style={styles.createTitle}>🥗 {t('mealPlan.createFirstPlan')}</Text>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.preferencesCard}
                            onPress={() => {
                                const newState = !showPreferencesInput;
                                setShowPreferencesInput(newState);
                                if (newState) {
                                    setTimeout(() => {
                                        preferencesInputRef.current?.focus();
                                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                                    }, 300);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.preferencesHeaderRow}>
                                <View style={styles.preferencesHeaderLeft}>
                                    <Ionicons name="options-outline" size={22} color="#10B981" />
                                    <Text style={styles.preferencesTitle}>{t('mealPlan.dietaryPreferences')}</Text>
                                </View>
                                <Ionicons
                                    name={showPreferencesInput ? "chevron-up" : "chevron-down"}
                                    size={22}
                                    color="#78909c"
                                />
                            </View>
                            <Text style={styles.preferencesHint}>{t('mealPlan.preferencesHint')}</Text>
                        </TouchableOpacity>

                        {showPreferencesInput && (
                            <View style={styles.preferencesInputContainer}>
                                <TextInput
                                    ref={preferencesInputRef}
                                    style={styles.preferencesInput}
                                    placeholder={t('mealPlan.preferencesPlaceholder')}
                                    placeholderTextColor="#999"
                                    value={dietaryRestrictions}
                                    onChangeText={(text) => {
                                        if (text.length <= 1000) {
                                            setDietaryRestrictions(text);
                                        }
                                    }}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={1000}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCounter}>
                                    {t('mealPlan.preferencesCharLimit', { current: dietaryRestrictions.length, max: 1000 })}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.generateButton} onPress={generateMealPlan}>
                            <Ionicons name="nutrition" size={22} color="#fff" />
                            <Text style={styles.generateButtonText}>{t('mealPlan.generatePlan')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
            {/* Header - Hide when typing preferences */}
            {!showPreferencesInput && (
                <View style={styles.header}>
                    <Text style={styles.title}>{t('mealPlan.title')}</Text>
                    <Text style={styles.subtitle}>{t('mealPlan.subtitle')}</Text>
                </View>
            )}

            {/* Tabs - Hide when typing preferences */}
            {!showPreferencesInput && (
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'myPlans' && styles.tabActive]}
                        onPress={() => setActiveTab('myPlans')}
                    >
                        <Ionicons name="list" size={20} color={activeTab === 'myPlans' ? '#10B981' : '#666'} />
                        <Text style={[styles.tabText, activeTab === 'myPlans' && styles.tabTextActive]}>
                            {t('mealPlan.myPlans')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'createNew' && styles.tabActive]}
                        onPress={() => setActiveTab('createNew')}
                    >
                        <Ionicons name="add-circle" size={20} color={activeTab === 'createNew' ? '#10B981' : '#666'} />
                        <Text style={[styles.tabText, activeTab === 'createNew' && styles.tabTextActive]}>
                            {t('mealPlan.createNew')}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tab Content */}
            {activeTab === 'myPlans' ? renderMyPlansTab() : renderCreateNewTab()}

            {/* Name Plan Modal */}
            <Modal
                visible={showNameModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('mealPlan.namePlan')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t('mealPlan.planNamePlaceholder')}
                            value={planName}
                            onChangeText={setPlanName}
                            maxLength={50}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setShowNameModal(false);
                                    setPendingPlan(null);
                                    setPlanName('');
                                }}
                            >
                                <Text style={styles.modalButtonTextCancel}>{t('mealPlan.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={savePlan}
                            >
                                <Text style={styles.modalButtonTextSave}>{t('mealPlan.savePlan')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Rename Plan Modal */}
            <Modal
                visible={showRenameModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRenameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('mealPlan.renamePlan')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t('mealPlan.enterPlanName')}
                            value={newPlanName}
                            onChangeText={setNewPlanName}
                            maxLength={50}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setShowRenameModal(false);
                                    setRenamingPlanId(null);
                                    setNewPlanName('');
                                }}
                            >
                                <Text style={styles.modalButtonTextCancel}>{t('mealPlan.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={renamePlan}
                            >
                                <Text style={styles.modalButtonTextSave}>{t('mealPlan.rename')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 20,
        paddingTop: 60, // Added for iPhone notch
        paddingBottom: 16,
        backgroundColor: '#f0f4f8',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    tabActive: {
        backgroundColor: '#ECFDF5',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    tabTextActive: {
        color: '#10B981',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    plansListContainer: {
        flex: 1,
        padding: 20,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    planCardSelected: {
        borderWidth: 2,
        borderColor: '#10B981',
    },
    planCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    planName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    planActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 4,
    },
    planDate: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    planPreview: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
    },
    selectedPlanDetails: {
        marginTop: 20,
    },
    detailsTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    preferencesDisplay: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    preferencesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10B981',
        marginBottom: 8,
    },
    preferencesText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    notesCard: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
        marginBottom: 16,
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    notesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
        marginLeft: 8,
    },
    notesText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    dayName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    mealsContainer: {
        padding: 16,
        paddingTop: 16, // Added for separation
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    mealItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    mealTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    mealName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textTransform: 'capitalize',
    },
    mealCalories: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '600',
        marginLeft: 8,
    },
    mealDescription: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    mealNotes: {
        fontSize: 13,
        color: '#666',
        marginTop: 6,
        fontStyle: 'italic',
    },
    createNewContainer: {
        flex: 1,
        padding: 20,
    },
    createNewContent: {
        alignItems: 'center',
        paddingTop: 40,
    },
    createTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 32,
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    preferencesCard: {
        backgroundColor: '#ECFDF5',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
        marginBottom: 16,
    },
    preferencesHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    preferencesHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    preferencesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#059669',
        marginLeft: 8,
    },
    preferencesHint: {
        fontSize: 13,
        color: '#047857',
    },
    stickyNotesContainer: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        margin: 16,
        marginBottom: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#90CAF9',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    preferencesInputContainer: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    preferencesInput: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    charCounter: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 8,
    },
    generateButton: {
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#f0f0f0',
    },
    modalButtonSave: {
        backgroundColor: '#10B981',
    },
    modalButtonTextCancel: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonTextSave: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
