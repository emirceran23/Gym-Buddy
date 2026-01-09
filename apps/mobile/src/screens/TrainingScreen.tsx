import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../contexts/LanguageContext';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    onPress: () => void;
}

const FeatureCard = ({ title, description, icon, color, bgColor, onPress }: FeatureCardProps) => (
    <TouchableOpacity style={[styles.featureCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.featureIconContainer, { backgroundColor: bgColor }]}>
            <Ionicons name={icon} size={32} color={color} />
        </View>
        <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
    </TouchableOpacity>
);

export default function TrainingScreen() {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('training.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('training.subtitle')}</Text>
                </View>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    {/* AI Meal Planner */}
                    <FeatureCard
                        title={t('training.mealPlanner')}
                        description={t('training.mealPlannerDesc')}
                        icon="restaurant-outline"
                        color="#10B981"
                        bgColor="#ECFDF5"
                        onPress={() => navigation.navigate('MealPlan')}
                    />

                    {/* AI Workout Planner */}
                    <FeatureCard
                        title={t('training.workoutPlanner')}
                        description={t('training.workoutPlannerDesc')}
                        icon="barbell-outline"
                        color="#EF4444"
                        bgColor="#FEE2E2"
                        onPress={() => navigation.navigate('WorkoutPlan')}
                    />

                    {/* Exercise Tutorials */}
                    <FeatureCard
                        title={t('training.exerciseTutorials')}
                        description={t('training.exerciseTutorialsDesc')}
                        icon="school-outline"
                        color="#4F46E5"
                        bgColor="#EEF2FF"
                        onPress={() => navigation.navigate('MuscleGroup')}
                    />

                    {/* Exercise Evaluation */}
                    <FeatureCard
                        title={t('training.exerciseEvaluation')}
                        description={t('training.exerciseEvaluationDesc')}
                        icon="videocam-outline"
                        color="#F59E0B"
                        bgColor="#FEF3C7"
                        onPress={() => navigation.navigate('ExerciseEvaluation', { exerciseId: 'biceps_curl' })}
                    />
                </View>

                {/* Quick Tips Section */}
                <View style={styles.tipsSection}>
                    <Text style={styles.tipsSectionTitle}>{t('training.quickTips')}</Text>
                    <View style={styles.tipCard}>
                        <Ionicons name="bulb" size={20} color="#F59E0B" />
                        <Text style={styles.tipText}>{t('training.tip1')}</Text>
                    </View>
                    <View style={styles.tipCard}>
                        <Ionicons name="bulb" size={20} color="#F59E0B" />
                        <Text style={styles.tipText}>{t('training.tip2')}</Text>
                    </View>
                    <View style={styles.tipCard}>
                        <Ionicons name="bulb" size={20} color="#F59E0B" />
                        <Text style={styles.tipText}>{t('training.tip3')}</Text>
                    </View>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    header: {
        paddingTop: 20,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#64748B',
        lineHeight: 22,
    },
    featuresContainer: {
        gap: 16,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    featureIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    tipsSection: {
        marginTop: 32,
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    tipsSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 16,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#78350F',
        lineHeight: 20,
    },
});
