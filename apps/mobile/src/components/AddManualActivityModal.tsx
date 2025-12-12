// Add Manual Activity Modal Component
// Multi-step wizard with real-time calorie preview

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Dimensions,
} from 'react-native';
import { ACTIVITY_DATABASE, ACTIVITY_CATEGORIES, type Activity } from '../constants/activityDatabase';
import { calculateAdvancedCalories, addManualActivity } from '../services/manualActivityService';
import { getUserProfile } from '../services/userProfileService';

const { width } = Dimensions.get('window');

interface AddManualActivityModalProps {
    visible: boolean;
    onClose: () => void;
    onActivityAdded: () => void;
}

type Step = 'category' | 'activity' | 'intensity' | 'duration' | 'advanced' | 'preview';
type Intensity = 'light' | 'moderate' | 'vigorous';

const AddManualActivityModal: React.FC<AddManualActivityModalProps> = ({
    visible,
    onClose,
    onActivityAdded,
}) => {
    const [step, setStep] = useState<Step>('category');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [intensity, setIntensity] = useState<Intensity>('moderate');
    const [duration, setDuration] = useState<string>('30');
    const [heartRate, setHeartRate] = useState<string>('');
    const [environment, setEnvironment] = useState<string>('indoor');
    const [caloriePreview, setCaloriePreview] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Calculate preview whenever params change
    useEffect(() => {
        if (selectedActivity && duration && parseInt(duration) > 0) {
            updateCaloriePreview();
        }
    }, [selectedActivity, intensity, duration, heartRate, environment]);

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

    const resetAndClose = () => {
        setStep('category');
        setSelectedCategory('');
        setSelectedActivity(null);
        setIntensity('moderate');
        setDuration('30');
        setHeartRate('');
        setEnvironment('indoor');
        setCaloriePreview(null);
        onClose();
    };

    const renderCategorySelection = () => {
        const categories = Object.entries(ACTIVITY_CATEGORIES);

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Aktivite Kategorisi Seçin</Text>
                <ScrollView style={styles.scrollView}>
                    {categories.map(([key, label]) => (
                        <TouchableOpacity
                            key={key}
                            style={styles.categoryCard}
                            onPress={() => {
                                setSelectedCategory(key);
                                setStep('activity');
                            }}
                        >
                            <Text style={styles.categoryText}>{label}</Text>
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
                    <Text style={styles.backText}>‹ Geri</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Aktivite Seçin</Text>
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
                                <Text style={styles.activityName}>{activity.name}</Text>
                                <Text style={styles.activityDescription}>{activity.description}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderIntensitySelection = () => {
        const intensities: { value: Intensity; label: string; color: string }[] = [
            { value: 'light', label: 'Hafif', color: '#4CAF50' },
            { value: 'moderate', label: 'Orta', color: '#FF9800' },
            { value: 'vigorous', label: 'Yoğun', color: '#F44336' },
        ];

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('activity')}>
                    <Text style={styles.backText}>‹ Geri</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Şiddet Seviyesi</Text>
                <Text style={styles.stepSubtitle}>
                    {selectedActivity?.icon} {selectedActivity?.name}
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
                    <Text style={styles.backText}>‹ Geri</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Süre</Text>
                <Text style={styles.stepSubtitle}>
                    {selectedActivity?.icon} {selectedActivity?.name} - {intensity === 'light' ? 'Hafif' : intensity === 'moderate' ? 'Orta' : 'Yoğun'}
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
                    <Text style={styles.durationUnit}>dakika</Text>
                </View>
                <View style={styles.quickDurations}>
                    {[15, 30, 45, 60].map(mins => (
                        <TouchableOpacity
                            key={mins}
                            style={styles.quickDurationButton}
                            onPress={() => setDuration(mins.toString())}
                        >
                            <Text style={styles.quickDurationText}>{mins} dk</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => setStep('preview')}
                    disabled={!duration || parseInt(duration) <= 0}
                >
                    <Text style={styles.nextButtonText}>Devam →</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPreview = () => {
        if (!caloriePreview) return null;

        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('duration')}>
                    <Text style={styles.backText}>‹ Geri</Text>
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Kalori Önizlemesi</Text>
                <View style={styles.previewCard}>
                    <Text style={styles.previewActivity}>
                        {selectedActivity?.icon} {selectedActivity?.name}
                    </Text>
                    <Text style={styles.previewDetails}>
                        {intensity === 'light' ? 'Hafif' : intensity === 'moderate' ? 'Orta' : 'Yoğun'} • {duration} dakika
                    </Text>

                    <View style={styles.totalCalories}>
                        <Text style={styles.totalCaloriesLabel}>Yakılacak Kalori</Text>
                        <Text style={styles.totalCaloriesValue}>{caloriePreview.totalCalories}</Text>
                        <Text style={styles.totalCaloriesUnit}>kcal</Text>
                    </View>

                    <View style={styles.breakdown}>
                        <Text style={styles.breakdownTitle}>Detaylı Hesaplama:</Text>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Base Kalori:</Text>
                            <Text style={styles.breakdownValue}>{caloriePreview.breakdown.baseCalories} kcal</Text>
                        </View>
                        {caloriePreview.breakdown.ageAdjustment !== 0 && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Yaş Ayarı:</Text>
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
                        {isLoading ? 'Kaydediliyor...' : '✓ Kaydet'}
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
                    <Text style={styles.headerTitle}>Manuel Aktivite Ekle</Text>
                    <View style={{ width: 30 }} />
                </View>

                {step === 'category' && renderCategorySelection()}
                {step === 'activity' && renderActivitySelection()}
                {step === 'intensity' && renderIntensitySelection()}
                {step === 'duration' && renderDurationInput()}
                {step === 'preview' && renderPreview()}
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
