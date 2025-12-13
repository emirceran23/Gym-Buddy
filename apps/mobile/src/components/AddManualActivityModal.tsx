// Add Manual Activity Modal Component
// Multi-step wizard with real-time calorie preview
// Enhanced with strength training: target muscle → exercise → sets/reps/weight

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { ACTIVITY_DATABASE, ACTIVITY_CATEGORIES, type Activity } from '../constants/activityDatabase';
import {
    calculateAdvancedCalories,
    addManualActivity,
    calculateStrengthCalories,
    addStrengthActivity,
    type StrengthActivityParams
} from '../services/manualActivityService';
import { getUserProfile } from '../services/userProfileService';
import {
    MUSCLE_GROUPS,
    EQUIPMENT_TRANSLATIONS,
    LEVEL_TRANSLATIONS,
    getExercisesByMuscleGroup,
    searchExercises,
    type StrengthExercise,
    type MuscleGroup,
} from '../constants/strengthExerciseDatabase';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

interface AddManualActivityModalProps {
    visible: boolean;
    onClose: () => void;
    onActivityAdded: () => void;
}

type Step = 'category' | 'activity' | 'intensity' | 'duration' | 'preview'
    | 'targetMuscle' | 'strengthExercise' | 'strengthDetails' | 'strengthPreview';
type Intensity = 'light' | 'moderate' | 'vigorous';

const AddManualActivityModal: React.FC<AddManualActivityModalProps> = ({
    visible,
    onClose,
    onActivityAdded,
}) => {
    // i18n hook
    const { t } = useLanguage();

    // General states
    const [step, setStep] = useState<Step>('category');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [intensity, setIntensity] = useState<Intensity>('moderate');
    const [duration, setDuration] = useState<string>('30');
    const [heartRate, setHeartRate] = useState<string>('');
    const [environment, setEnvironment] = useState<string>('indoor');
    const [caloriePreview, setCaloriePreview] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Strength training specific states
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
    const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([]);
    const [selectedStrengthExercise, setSelectedStrengthExercise] = useState<StrengthExercise | null>(null);
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState<string>('');
    const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
    const [sets, setSets] = useState<string>('3');
    const [reps, setReps] = useState<string>('10');
    const [liftedWeight, setLiftedWeight] = useState<string>('');
    const [restTime, setRestTime] = useState<string>('60');
    const [strengthCaloriePreview, setStrengthCaloriePreview] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Load user profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            const profile = await getUserProfile();
            setUserProfile(profile);
        };
        loadProfile();
    }, []);

    // Calculate preview whenever params change (for regular activities)
    useEffect(() => {
        if (selectedActivity && duration && parseInt(duration) > 0) {
            updateCaloriePreview();
        }
    }, [selectedActivity, intensity, duration, heartRate, environment]);

    // Calculate preview whenever strength params change
    useEffect(() => {
        if (selectedStrengthExercise && sets && reps && liftedWeight) {
            updateStrengthCaloriePreview();
        }
    }, [selectedStrengthExercise, sets, reps, liftedWeight, restTime]);

    // Set default weight for body only exercises
    useEffect(() => {
        if (selectedStrengthExercise && userProfile) {
            if (selectedStrengthExercise.equipment === 'body only') {
                setLiftedWeight(userProfile.weight?.toString() || '');
            } else {
                setLiftedWeight('');
            }
        }
    }, [selectedStrengthExercise, userProfile]);

    // Load exercises when muscle group is selected
    useEffect(() => {
        if (selectedMuscleGroup) {
            const exercises = getExercisesByMuscleGroup(selectedMuscleGroup.id);
            setStrengthExercises(exercises);
        }
    }, [selectedMuscleGroup]);

    // Filter exercises based on search and equipment
    const filteredExercises = useMemo(() => {
        let filtered = strengthExercises;

        if (exerciseSearchQuery) {
            filtered = searchExercises(exerciseSearchQuery, filtered);
        }

        if (selectedEquipment) {
            filtered = filtered.filter(e => e.equipment === selectedEquipment);
        }

        return filtered;
    }, [strengthExercises, exerciseSearchQuery, selectedEquipment]);

    const updateCaloriePreview = async () => {
        if (!selectedActivity) return;

        const profile = await getUserProfile();
        if (!profile) return;

        try {
            const preview = calculateAdvancedCalories({
                activityType: selectedActivity.id,
                intensity,
                duration: parseInt(duration),
                weight: profile.weight,
                age: profile.age,
                gender: profile.gender,
                fitnessLevel: profile.fitnessLevel,
                bmi: profile.bmi,
                heartRate: heartRate ? parseInt(heartRate) : undefined,
                environment: environment as any,
            });

            setCaloriePreview(preview);
        } catch (error) {
            console.error('Error calculating preview:', error);
        }
    };

    const updateStrengthCaloriePreview = async () => {
        if (!selectedStrengthExercise) return;

        const profile = await getUserProfile();
        if (!profile) return;

        try {
            const preview = calculateStrengthCalories({
                exerciseId: selectedStrengthExercise.id,
                exerciseName: selectedStrengthExercise.name,
                sets: parseInt(sets) || 0,
                reps: parseInt(reps) || 0,
                liftedWeight: parseFloat(liftedWeight) || 0,
                restTime: parseInt(restTime) || 60,
                userWeight: profile.weight,
                age: profile.age,
                gender: profile.gender,
                fitnessLevel: profile.fitnessLevel,
                bmi: profile.bmi,
            });

            setStrengthCaloriePreview(preview);
        } catch (error) {
            console.error('Error calculating strength preview:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedActivity) return;

        setIsLoading(true);
        try {
            const profile = await getUserProfile();
            if (!profile) {
                alert('Lütfen önce profil bilgilerinizi tamamlayın');
                return;
            }

            await addManualActivity({
                activityType: selectedActivity.id,
                intensity,
                duration: parseInt(duration),
                weight: profile.weight,
                age: profile.age,
                gender: profile.gender,
                fitnessLevel: profile.fitnessLevel,
                bmi: profile.bmi,
                heartRate: heartRate ? parseInt(heartRate) : undefined,
                environment: environment as any,
            });

            onActivityAdded();
            resetAndClose();
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Aktivite kaydedilirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStrengthSave = async () => {
        if (!selectedStrengthExercise) return;

        setIsLoading(true);
        try {
            const profile = await getUserProfile();
            if (!profile) {
                alert('Lütfen önce profil bilgilerinizi tamamlayın');
                return;
            }

            await addStrengthActivity({
                exerciseId: selectedStrengthExercise.id,
                exerciseName: selectedStrengthExercise.name,
                sets: parseInt(sets) || 0,
                reps: parseInt(reps) || 0,
                liftedWeight: parseFloat(liftedWeight) || 0,
                restTime: parseInt(restTime) || 60,
                userWeight: profile.weight,
                age: profile.age,
                gender: profile.gender,
                fitnessLevel: profile.fitnessLevel,
                bmi: profile.bmi,
            });

            onActivityAdded();
            resetAndClose();
        } catch (error) {
            console.error('Error saving strength activity:', error);
            alert('Aktivite kaydedilirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const resetAndClose = () => {
        setStep('category');
        setSelectedCategory('');
        setSelectedActivity(null);
        setIntensity('moderate');
        setDuration('30');
        setHeartRate('');
        setEnvironment('indoor');
        setCaloriePreview(null);
        // Reset strength states
        setSelectedMuscleGroup(null);
        setStrengthExercises([]);
        setSelectedStrengthExercise(null);
        setExerciseSearchQuery('');
        setSelectedEquipment(null);
        setSets('3');
        setReps('10');
        setLiftedWeight('');
        setRestTime('60');
        setStrengthCaloriePreview(null);
        onClose();
    };

    const renderCategorySelection = () => {
        const categories = Object.entries(ACTIVITY_CATEGORIES);

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>{t('calories.selectCategory')}</Text>
                <ScrollView style={styles.scrollView}>
                    {categories.map(([key, label]) => (
                        <TouchableOpacity
                            key={key}
                            style={styles.categoryCard}
                            onPress={() => {
                                setSelectedCategory(key);
                                // If strength category, go to target muscle selection
                                if (key === 'strength') {
                                    setStep('targetMuscle');
                                } else {
                                    setStep('activity');
                                }
                            }}
                        >
                            <Text style={styles.categoryText}>{t(`calories.categories.${key}`)}</Text>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderActivitySelection = () => {
        const activities = ACTIVITY_DATABASE.filter(a => a.category === selectedCategory);

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('category')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.selectActivity')}</Text>
                <ScrollView style={styles.scrollView}>
                    {activities.map(activity => (
                        <TouchableOpacity
                            key={activity.id}
                            style={styles.activityCard}
                            onPress={() => {
                                setSelectedActivity(activity);
                                setStep('intensity');
                            }}
                        >
                            <Text style={styles.activityIcon}>{activity.icon}</Text>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityName}>{t(`activities.${activity.id}`, { defaultValue: activity.name })}</Text>
                                <Text style={styles.activityDescription}>{t(`activities.${activity.id}_desc`, { defaultValue: activity.description })}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    // ======== STRENGTH TRAINING FLOW ========

    const renderTargetMuscleSelection = () => {
        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('category')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.targetMuscle')}</Text>
                <Text style={styles.stepSubtitle}>{t('calories.selectMuscleGroup')}</Text>
                <ScrollView style={styles.scrollView}>
                    {MUSCLE_GROUPS.map(muscleGroup => (
                        <TouchableOpacity
                            key={muscleGroup.id}
                            style={styles.muscleGroupCard}
                            onPress={() => {
                                setSelectedMuscleGroup(muscleGroup);
                                setStep('strengthExercise');
                            }}
                        >
                            <Text style={styles.muscleGroupIcon}>{muscleGroup.icon}</Text>
                            <Text style={styles.muscleGroupName}>{t(`muscleGroups.${muscleGroup.id}`, { defaultValue: muscleGroup.name })}</Text>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderStrengthExerciseSelection = () => {
        // Get unique equipment from current exercises
        const availableEquipment = Array.from(
            new Set(strengthExercises.map(e => e.equipment).filter(Boolean))
        ) as string[];

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => {
                    setStep('targetMuscle');
                    setExerciseSearchQuery('');
                    setSelectedEquipment(null);
                }}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.selectExerciseTitle')}</Text>
                <Text style={styles.stepSubtitle}>
                    {selectedMuscleGroup?.icon} {selectedMuscleGroup?.name} - {filteredExercises.length} {t('calories.exercisesCount')}
                </Text>

                {/* Search Bar */}
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('calories.searchPlaceholder')}
                    value={exerciseSearchQuery}
                    onChangeText={setExerciseSearchQuery}
                />

                {/* Equipment Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterChip, !selectedEquipment && styles.filterChipSelected]}
                        onPress={() => setSelectedEquipment(null)}
                    >
                        <Text style={[styles.filterChipText, !selectedEquipment && styles.filterChipTextSelected]}>
                            {t('calories.all')}
                        </Text>
                    </TouchableOpacity>
                    {availableEquipment.map(equipment => (
                        <TouchableOpacity
                            key={equipment}
                            style={[styles.filterChip, selectedEquipment === equipment && styles.filterChipSelected]}
                            onPress={() => setSelectedEquipment(equipment)}
                        >
                            <Text style={[styles.filterChipText, selectedEquipment === equipment && styles.filterChipTextSelected]}>
                                {EQUIPMENT_TRANSLATIONS[equipment] || equipment}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Exercise List */}
                <ScrollView style={styles.exerciseListScrollView}>
                    {filteredExercises.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>{t('calories.noExercises')}</Text>
                        </View>
                    ) : (
                        filteredExercises.map(exercise => (
                            <TouchableOpacity
                                key={exercise.id}
                                style={styles.exerciseCard}
                                onPress={() => {
                                    setSelectedStrengthExercise(exercise);
                                    setStep('strengthDetails');
                                }}
                            >
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{exercise.name.replace(/_/g, ' ')}</Text>
                                    <View style={styles.exerciseTags}>
                                        {exercise.equipment && (
                                            <Text style={styles.exerciseTag}>
                                                {EQUIPMENT_TRANSLATIONS[exercise.equipment] || exercise.equipment}
                                            </Text>
                                        )}
                                        <Text style={[styles.exerciseTag, styles.levelTag]}>
                                            {t(`difficultyLevels.${exercise.level}`, { defaultValue: LEVEL_TRANSLATIONS[exercise.level] || exercise.level })}
                                        </Text>
                                        {exercise.mechanic && (
                                            <Text style={[styles.exerciseTag, styles.mechanicTag]}>
                                                {t(`mechanic.${exercise.mechanic}`)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.arrowText}>›</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    };

    const renderStrengthDetails = () => {
        const restTimeOptions = [30, 60, 90, 120];

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('strengthExercise')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.trainingDetails')}</Text>
                <Text style={styles.stepSubtitle}>{selectedStrengthExercise?.name.replace(/_/g, ' ')}</Text>

                <ScrollView style={styles.scrollView}>
                    {/* Sets Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('calories.sets')}</Text>
                        <View style={styles.numberInputContainer}>
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={() => setSets(Math.max(1, parseInt(sets) - 1).toString())}
                            >
                                <Text style={styles.numberButtonText}>−</Text>
                            </TouchableOpacity>
                            <TextInput
                                style={styles.numberInput}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={() => setSets((parseInt(sets) + 1).toString())}
                            >
                                <Text style={styles.numberButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Reps Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('calories.reps')}</Text>
                        <View style={styles.numberInputContainer}>
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={() => setReps(Math.max(1, parseInt(reps) - 1).toString())}
                            >
                                <Text style={styles.numberButtonText}>−</Text>
                            </TouchableOpacity>
                            <TextInput
                                style={styles.numberInput}
                                value={reps}
                                onChangeText={setReps}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={() => setReps((parseInt(reps) + 1).toString())}
                            >
                                <Text style={styles.numberButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Weight Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('calories.weight')}</Text>
                        <TextInput
                            style={styles.weightInput}
                            value={liftedWeight}
                            onChangeText={setLiftedWeight}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            maxLength={5}
                        />
                        <View style={styles.quickWeights}>
                            {[5, 10, 15, 20, 25, 30].map(w => (
                                <TouchableOpacity
                                    key={w}
                                    style={styles.quickWeightButton}
                                    onPress={() => setLiftedWeight(w.toString())}
                                >
                                    <Text style={styles.quickWeightText}>{w} kg</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Rest Time */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('calories.restTime')}</Text>
                        <TextInput
                            style={styles.weightInput}
                            value={restTime}
                            onChangeText={setRestTime}
                            keyboardType="numeric"
                            placeholder="60"
                            maxLength={3}
                        />
                        <View style={styles.quickWeights}>
                            {[0, 15, 30, 45, 60].map(time => (
                                <TouchableOpacity
                                    key={time}
                                    style={styles.quickWeightButton}
                                    onPress={() => setRestTime(time.toString())}
                                >
                                    <Text style={styles.quickWeightText}>{time} sn</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[styles.nextButton, (!liftedWeight || parseFloat(liftedWeight) <= 0) && styles.nextButtonDisabled]}
                        onPress={() => setStep('strengthPreview')}
                        disabled={!liftedWeight || parseFloat(liftedWeight) <= 0}
                    >
                        <Text style={styles.nextButtonText}>{t('calories.continue')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    };

    const renderStrengthPreview = () => {
        if (!strengthCaloriePreview) {
            return (
                <View style={styles.stepContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            );
        }

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('strengthDetails')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.caloriePreview')}</Text>

                <ScrollView style={styles.scrollView}>
                    <View style={styles.previewCard}>
                        <Text style={styles.previewActivity}>💪 {selectedStrengthExercise?.name.replace(/_/g, ' ')}</Text>
                        <Text style={styles.previewDetails}>
                            {sets} {t('calories.set')} × {reps} {t('calories.rep')} × {liftedWeight} kg
                        </Text>

                        <View style={styles.totalCalories}>
                            <Text style={styles.totalCaloriesLabel}>{t('calories.caloriesBurned')}</Text>
                            <Text style={styles.totalCaloriesValue}>{strengthCaloriePreview.totalCalories}</Text>
                            <Text style={styles.totalCaloriesUnit}>kcal</Text>
                        </View>

                        <View style={styles.breakdown}>
                            <Text style={styles.breakdownTitle}>{t('calories.detailedCalc')}</Text>

                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>{t('calories.totalVolumeLabel')}</Text>
                                <Text style={styles.breakdownValue}>
                                    {strengthCaloriePreview.breakdown.totalVolume} kg
                                </Text>
                            </View>

                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>{t('calories.volumeCalories')}</Text>
                                <Text style={styles.breakdownValue}>
                                    {strengthCaloriePreview.breakdown.volumeCalories} kcal
                                </Text>
                            </View>

                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>{t('calories.metCalories')}</Text>
                                <Text style={styles.breakdownValue}>
                                    {strengthCaloriePreview.breakdown.metCalories} kcal
                                </Text>
                            </View>

                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Tahmini {t('calories.duration')}:</Text>
                                <Text style={styles.breakdownValue}>
                                    {strengthCaloriePreview.breakdown.estimatedDuration} {t('calories.minutes')}
                                </Text>
                            </View>

                            {strengthCaloriePreview.breakdown.epocBonus > 0 && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('calories.epocBonusLabel')}</Text>
                                    <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>
                                        +{strengthCaloriePreview.breakdown.epocBonus} kcal
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleStrengthSave}
                        disabled={isLoading}
                    >
                        <Text style={styles.saveButtonText}>
                            {isLoading ? t('calories.saving') : t('calories.save')}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    };

    // ======== REGULAR FLOW CONTINUES ========

    const renderIntensitySelection = () => {
        const intensities: { value: Intensity; label: string; color: string }[] = [
            { value: 'light', label: t('calories.light'), color: '#4CAF50' },
            { value: 'moderate', label: t('calories.moderate'), color: '#FF9800' },
            { value: 'vigorous', label: t('calories.vigorous'), color: '#F44336' },
        ];

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('activity')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.intensityLevel')}</Text>
                <Text style={styles.stepSubtitle}>
                    {selectedActivity?.icon} {t(`activities.${selectedActivity?.id}`, { defaultValue: selectedActivity?.name })}
                </Text>
                <View style={styles.intensityContainer}>
                    {intensities.map(item => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.intensityChip,
                                intensity === item.value && { backgroundColor: item.color },
                            ]}
                            onPress={() => {
                                setIntensity(item.value);
                                setStep('duration');
                            }}
                        >
                            <Text
                                style={[
                                    styles.intensityText,
                                    intensity === item.value && styles.intensityTextSelected,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderDurationInput = () => {
        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('intensity')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.duration')}</Text>
                <Text style={styles.stepSubtitle}>
                    {selectedActivity?.icon} {t(`activities.${selectedActivity?.id}`, { defaultValue: selectedActivity?.name })} - {intensity === 'light' ? t('calories.light') : intensity === 'moderate' ? t('calories.moderate') : t('calories.vigorous')}
                </Text>
                <View style={styles.durationInputContainer}>
                    <TextInput
                        style={styles.durationInput}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="numeric"
                        placeholder="30"
                        maxLength={3}
                    />
                    <Text style={styles.durationUnit}>{t('calories.minutes')}</Text>
                </View>
                <View style={styles.quickDurations}>
                    {[15, 30, 45, 60].map(mins => (
                        <TouchableOpacity
                            key={mins}
                            style={styles.quickDurationButton}
                            onPress={() => setDuration(mins.toString())}
                        >
                            <Text style={styles.quickDurationText}>{mins} {t('calories.minutes')}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => setStep('preview')}
                    disabled={!duration || parseInt(duration) <= 0}
                >
                    <Text style={styles.nextButtonText}>{t('calories.continue')}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPreview = () => {
        if (!caloriePreview) return null;

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('duration')}>
                    <Text style={styles.backText}>{t('calories.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>{t('calories.caloriePreview')}</Text>
                <View style={styles.previewCard}>
                    <Text style={styles.previewActivity}>
                        {selectedActivity?.icon} {t(`activities.${selectedActivity?.id}`, { defaultValue: selectedActivity?.name })}
                    </Text>
                    <Text style={styles.previewDetails}>
                        {intensity === 'light' ? t('calories.light') : intensity === 'moderate' ? t('calories.moderate') : t('calories.vigorous')} • {duration} {t('calories.minutes')}
                    </Text>

                    <View style={styles.totalCalories}>
                        <Text style={styles.totalCaloriesLabel}>{t('calories.caloriesBurned')}</Text>
                        <Text style={styles.totalCaloriesValue}>{caloriePreview.totalCalories}</Text>
                        <Text style={styles.totalCaloriesUnit}>kcal</Text>
                    </View>

                    <View style={styles.breakdown}>
                        <Text style={styles.breakdownTitle}>{t('calories.detailedCalc')}</Text>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>{t('calories.baseCaloriesLabel')}</Text>
                            <Text style={styles.breakdownValue}>{caloriePreview.breakdown.baseCalories} kcal</Text>
                        </View>
                        {caloriePreview.breakdown.ageAdjustment !== 0 && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>{t('calories.ageAdjustmentLabel')}</Text>
                                <Text style={[styles.breakdownValue, { color: caloriePreview.breakdown.ageAdjustment > 0 ? '#4CAF50' : '#F44336' }]}>
                                    {caloriePreview.breakdown.ageAdjustment > 0 ? '+' : ''}{caloriePreview.breakdown.ageAdjustment} kcal
                                </Text>
                            </View>
                        )}
                        {caloriePreview.breakdown.fitnessAdjustment !== 0 && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Kondisyon:</Text>
                                <Text style={[styles.breakdownValue, { color: caloriePreview.breakdown.fitnessAdjustment > 0 ? '#4CAF50' : '#F44336' }]}>
                                    {caloriePreview.breakdown.fitnessAdjustment > 0 ? '+' : ''}{caloriePreview.breakdown.fitnessAdjustment} kcal
                                </Text>
                            </View>
                        )}
                        {caloriePreview.breakdown.epocBonus > 0 && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>EPOC Bonus:</Text>
                                <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>
                                    +{caloriePreview.breakdown.epocBonus} kcal
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text style={styles.saveButtonText}>
                        {isLoading ? t('calories.saving') : t('calories.save')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={resetAndClose}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('modalTitles.addManualActivity')}</Text>
                    <View style={{ width: 30 }} />
                </View>

                {step === 'category' && renderCategorySelection()}
                {step === 'activity' && renderActivitySelection()}
                {step === 'intensity' && renderIntensitySelection()}
                {step === 'duration' && renderDurationInput()}
                {step === 'preview' && renderPreview()}

                {/* Strength training flow */}
                {step === 'targetMuscle' && renderTargetMuscleSelection()}
                {step === 'strengthExercise' && renderStrengthExerciseSelection()}
                {step === 'strengthDetails' && renderStrengthDetails()}
                {step === 'strengthPreview' && renderStrengthPreview()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    closeButton: {
        fontSize: 18,
        color: '#fff',
        backgroundColor: '#F44336',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    stepContainer: {
        flex: 1,
        padding: 20,
    },
    backButton: {
        marginBottom: 10,
    },
    backText: {
        fontSize: 16,
        color: '#2196F3',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    categoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    categoryText: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
    },
    arrowText: {
        fontSize: 24,
        color: '#999',
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    activityIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    activityInfo: {
        flex: 1,
    },
    activityName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    activityDescription: {
        fontSize: 13,
        color: '#666',
    },
    // Muscle Group Styles
    muscleGroupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    muscleGroupIcon: {
        fontSize: 28,
        marginRight: 16,
    },
    muscleGroupName: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    // Search & Filter Styles
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    filterContainer: {
        marginBottom: 12,
        maxHeight: 44,
    },
    filterChip: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
    },
    filterChipSelected: {
        backgroundColor: '#2196F3',
    },
    filterChipText: {
        fontSize: 14,
        color: '#666',
    },
    filterChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    // Exercise List Styles
    exerciseListScrollView: {
        flex: 1,
    },
    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    exerciseTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    exerciseTag: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        fontSize: 11,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    levelTag: {
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
    },
    mechanicTag: {
        backgroundColor: '#fff3e0',
        color: '#e65100',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
    },
    // Strength Details Styles
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    numberInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberButton: {
        width: 50,
        height: 50,
        backgroundColor: '#e0e0e0',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberButtonText: {
        fontSize: 24,
        color: '#333',
        fontWeight: 'bold',
    },
    numberInput: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 80,
        textAlign: 'center',
        marginHorizontal: 20,
    },
    weightInput: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#2196F3',
        paddingVertical: 10,
        marginBottom: 16,
    },
    quickWeights: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    quickWeightButton: {
        backgroundColor: '#e3f2fd',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    quickWeightText: {
        color: '#2196F3',
        fontWeight: '600',
    },
    restTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    restTimeChip: {
        backgroundColor: '#e0e0e0',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    restTimeChipSelected: {
        backgroundColor: '#4CAF50',
    },
    restTimeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    restTimeTextSelected: {
        color: '#fff',
    },
    // Original Styles
    intensityContainer: {
        marginTop: 20,
    },
    intensityChip: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    intensityText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    intensityTextSelected: {
        color: '#fff',
    },
    durationInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    durationInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#333',
        borderBottomWidth: 2,
        borderBottomColor: '#2196F3',
        minWidth: 100,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    durationUnit: {
        fontSize: 20,
        color: '#666',
        marginLeft: 10,
    },
    quickDurations: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
    },
    quickDurationButton: {
        backgroundColor: '#e3f2fd',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    quickDurationText: {
        color: '#2196F3',
        fontWeight: '600',
    },
    nextButton: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    nextButtonDisabled: {
        backgroundColor: '#ccc',
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    previewCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    previewActivity: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    previewDetails: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    totalCalories: {
        alignItems: 'center',
        marginBottom: 30,
        paddingVertical: 20,
        backgroundColor: '#e8f5e9',
        borderRadius: 12,
    },
    totalCaloriesLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    totalCaloriesValue: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    totalCaloriesUnit: {
        fontSize: 18,
        color: '#666',
    },
    breakdown: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddManualActivityModal;
