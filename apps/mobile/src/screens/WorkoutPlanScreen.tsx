import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config';
import { useTranslation } from '../contexts/LanguageContext';

interface Exercise {
    name: string;
    sets: number;
    reps: string;
    equipment: string;
    bodyPart: string;
}

interface DayWorkout {
    day: string;
    focus: string;
    exercises: Exercise[];
}

interface WorkoutPlanItem {
    id: string;
    name: string;
    createdAt: string;
    preferences: string;
    workout_plan: DayWorkout[];
    notes: string;
}

const WORKOUT_PLANS_STORAGE_KEY = 'workoutPlans';

export default function WorkoutPlanScreen() {
    const navigation = useNavigation();
    const { t } = useTranslation();

    // Tab state
    const [activeTab, setActiveTab] = useState<'myPlans' | 'createNew'>('myPlans');

    // Plans state
    const [savedPlans, setSavedPlans] = useState<WorkoutPlanItem[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<WorkoutPlanItem | null>(null);

    // Create new plan state
    const [loading, setLoading] = useState(false);
    const [workoutPreferences, setWorkoutPreferences] = useState('');
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
            const oldPlan = await AsyncStorage.getItem('workoutPlan');
            if (oldPlan) {
                const parsed = JSON.parse(oldPlan);
                const migrated: WorkoutPlanItem = {
                    id: Date.now().toString(),
                    name: 'My Workout Plan',
                    createdAt: new Date().toISOString(),
                    preferences: parsed.workoutPreferences || '',
                    workout_plan: parsed.workout_plan,
                    notes: parsed.notes
                };
                const existingPlans = await loadPlansFromStorage();
                await AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify([...existingPlans, migrated]));
                await AsyncStorage.removeItem('workoutPlan');
                loadPlans();
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    };

    const loadPlansFromStorage = async (): Promise<WorkoutPlanItem[]> => {
        try {
            const plansJson = await AsyncStorage.getItem(WORKOUT_PLANS_STORAGE_KEY);
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

        const newPlan: WorkoutPlanItem = {
            id: Date.now().toString(),
            name: planName.trim() || `Workout Plan - ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            preferences: workoutPreferences.trim(),
            workout_plan: pendingPlan.workout_plan,
            notes: pendingPlan.notes
        };

        const updatedPlans = [...savedPlans, newPlan];
        await AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
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
            t('workoutPlan.deletePlan'),
            t('workoutPlan.deleteConfirm'),
            [
                { text: t('workoutPlan.cancel'), style: 'cancel' },
                {
                    text: t('workoutPlan.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const updatedPlans = savedPlans.filter(p => p.id !== planId);
                        await AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
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
        await AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
        setSavedPlans(updatedPlans);
        if (selectedPlan?.id === renamingPlanId) {
            setSelectedPlan({ ...selectedPlan, name: newPlanName.trim() });
        }

        setShowRenameModal(false);
        setRenamingPlanId(null);
        setNewPlanName('');
    };

    const generateWorkoutPlan = async () => {
        try {
            setLoading(true);

            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) {
                Alert.alert(t('common.error'), 'User data not found');
                navigation.navigate('GoalSetup' as never);
                return;
            }

            const userData = JSON.parse(userDataStr);
            console.log('📤 Sending workout plan request');
            if (workoutPreferences.trim()) {
                console.log('🏋️ Workout preferences:', workoutPreferences);
            }

            const response = await fetch(API_ENDPOINTS.GENERATE_WORKOUT_PLAN, {
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
                    workoutPreferences: workoutPreferences.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate workout plan');
            }

            console.log('✅ Workout plan received');

            // Show naming modal
            setPendingPlan(data);
            setShowNameModal(true);

        } catch (err: any) {
            console.error('❌ Error generating workout plan:', err);
            Alert.alert(t('common.error'), err.message || t('workoutPlan.errorCreating'));
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: string) => setExpandedDay(expandedDay === day ? null : day);

    const getWorkoutDaysCount = (plan: WorkoutPlanItem) => {
        return plan.workout_plan.filter(day =>
            day.focus.toLowerCase() !== 'rest day' &&
            day.focus.toLowerCase() !== 'rest' &&
            day.exercises && day.exercises.length > 0
        ).length;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Render functions
    const renderMyPlansTab = () => {
        if (savedPlans.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="barbell-outline" size={64} color="#EF4444" />
                    <Text style={styles.emptyTitle}>{t('workoutPlan.noPlansYet')}</Text>
                    <Text style={styles.emptySubtitle}>{t('workoutPlan.createFirstPlan')}</Text>
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
                            <Text style={styles.planDate}>{t('workoutPlan.createdOn', { date: formatDate(plan.createdAt) })}</Text>
                        </TouchableOpacity>
                    ))}

                    {selectedPlan && (
                        <View style={styles.selectedPlanDetails}>
                            <Text style={styles.detailsTitle}>📋 {selectedPlan.name}</Text>

                            {selectedPlan.preferences && (
                                <View style={styles.preferencesDisplay}>
                                    <Text style={styles.preferencesLabel}>{t('workoutPlan.currentPreferences')}</Text>
                                    <Text style={styles.preferencesText}>{selectedPlan.preferences}</Text>
                                </View>
                            )}

                            {selectedPlan.workout_plan.map((dayWorkout, index) => (
                                <View key={index} style={styles.dayCard}>
                                    <TouchableOpacity
                                        style={styles.dayHeader}
                                        onPress={() => toggleDay(dayWorkout.day)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.dayHeaderLeft}>
                                            <Text style={styles.dayName}>{dayWorkout.day}</Text>
                                            <Text style={styles.dayFocus}>💪 {dayWorkout.focus}</Text>
                                        </View>
                                        <Ionicons
                                            name={expandedDay === dayWorkout.day ? 'chevron-up' : 'chevron-down'}
                                            size={24}
                                            color="#666"
                                        />
                                    </TouchableOpacity>

                                    {expandedDay === dayWorkout.day && dayWorkout.exercises && dayWorkout.exercises.length > 0 && (
                                        <View style={styles.exercisesContainer}>
                                            {dayWorkout.exercises.map((exercise, exIndex) => (
                                                <View key={exIndex} style={styles.exerciseItem}>
                                                    <View style={styles.exerciseHeader}>
                                                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                        <Text style={styles.exerciseSetsReps}>
                                                            {exercise.sets} {t('workoutPlan.sets')} × {exercise.reps} {t('workoutPlan.reps')}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.exerciseDetails}>
                                                        <Text style={styles.exerciseEquipment}>🏋️ {exercise.equipment}</Text>
                                                        <Text style={styles.exerciseBodyPart}>🎯 {exercise.bodyPart}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {expandedDay === dayWorkout.day && (!dayWorkout.exercises || dayWorkout.exercises.length === 0) && (
                                        <View style={styles.restDayContainer}>
                                            <Ionicons name="bed-outline" size={32} color="#999" />
                                            <Text style={styles.restDayText}>Rest Day</Text>
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
                    <ActivityIndicator size="large" color="#EF4444" />
                    <Text style={styles.loadingText}>{t('workoutPlan.loading')}</Text>
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
                                <Ionicons name="sparkles" size={64} color="#EF4444" />
                                <Text style={styles.createTitle}>🎯 {t('workoutPlan.createFirstPlan')}</Text>
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
                                        // Header is hidden, so scroll to top to show input clearly
                                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                                    }, 300);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.preferencesHeaderRow}>
                                <View style={styles.preferencesHeaderLeft}>
                                    <Ionicons name="settings-outline" size={22} color="#EF4444" />
                                    <Text style={styles.preferencesTitle}>{t('workoutPlan.workoutPreferences')}</Text>
                                </View>
                                <Ionicons
                                    name={showPreferencesInput ? "chevron-up" : "chevron-down"}
                                    size={22}
                                    color="#78909c"
                                />
                            </View>
                            <Text style={styles.preferencesHint}>{t('workoutPlan.preferencesHint')}</Text>
                        </TouchableOpacity>

                        {showPreferencesInput && (
                            <View style={styles.preferencesInputContainer}>
                                <TextInput
                                    ref={preferencesInputRef}
                                    style={styles.preferencesInput}
                                    placeholder={t('workoutPlan.preferencesPlaceholder')}
                                    placeholderTextColor="#999"
                                    value={workoutPreferences}
                                    onChangeText={(text) => {
                                        if (text.length <= 500) {
                                            setWorkoutPreferences(text);
                                        }
                                    }}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCounter}>
                                    {workoutPreferences.length}/500 characters
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.generateButton} onPress={generateWorkoutPlan}>
                            <Ionicons name="sparkles" size={22} color="#fff" />
                            <Text style={styles.generateButtonText}>{t('workoutPlan.generatePlan')}</Text>
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
                    <Text style={styles.title}>{t('workoutPlan.title')}</Text>
                    <Text style={styles.subtitle}>{t('workoutPlan.subtitle')}</Text>
                </View>
            )}

            {/* Tabs - Hide when typing preferences */}
            {!showPreferencesInput && (
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'myPlans' && styles.tabActive]}
                        onPress={() => setActiveTab('myPlans')}
                    >
                        <Ionicons name="list" size={20} color={activeTab === 'myPlans' ? '#EF4444' : '#666'} />
                        <Text style={[styles.tabText, activeTab === 'myPlans' && styles.tabTextActive]}>
                            {t('workoutPlan.myPlans')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'createNew' && styles.tabActive]}
                        onPress={() => setActiveTab('createNew')}
                    >
                        <Ionicons name="add-circle" size={20} color={activeTab === 'createNew' ? '#EF4444' : '#666'} />
                        <Text style={[styles.tabText, activeTab === 'createNew' && styles.tabTextActive]}>
                            {t('workoutPlan.createNew')}
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
                        <Text style={styles.modalTitle}>{t('workoutPlan.namePlan')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t('workoutPlan.planNamePlaceholder')}
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
                                <Text style={styles.modalButtonTextCancel}>{t('workoutPlan.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={savePlan}
                            >
                                <Text style={styles.modalButtonTextSave}>{t('workoutPlan.savePlan')}</Text>
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
                        <Text style={styles.modalTitle}>{t('workoutPlan.renamePlan')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t('workoutPlan.enterPlanName')}
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
                                <Text style={styles.modalButtonTextCancel}>{t('workoutPlan.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={renamePlan}
                            >
                                <Text style={styles.modalButtonTextSave}>{t('workoutPlan.rename')}</Text>
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
        backgroundColor: '#FEE2E2',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    tabTextActive: {
        color: '#EF4444',
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
        borderColor: '#EF4444',
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
        color: '#EF4444',
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
        borderLeftColor: '#EF4444',
    },
    preferencesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
        marginBottom: 8,
    },
    preferencesText: {
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
    dayHeaderLeft: {
        flex: 1,
    },
    dayName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    dayFocus: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '600',
    },
    exercisesContainer: {
        padding: 16,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    exerciseItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    exerciseHeader: {
        marginBottom: 8,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    exerciseSetsReps: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    },
    exerciseDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    exerciseEquipment: {
        fontSize: 13,
        color: '#666',
    },
    exerciseBodyPart: {
        fontSize: 13,
        color: '#666',
    },
    restDayContainer: {
        padding: 32,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    restDayText: {
        fontSize: 16,
        color: '#999',
        marginTop: 8,
    },
    notesCard: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
        marginTop: 16,
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
        backgroundColor: '#FEE2E2',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
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
        color: '#DC2626',
        marginLeft: 8,
    },
    preferencesHint: {
        fontSize: 13,
        color: '#991B1B',
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
        backgroundColor: '#EF4444',
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
        backgroundColor: '#EF4444',
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
