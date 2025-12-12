import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Progress from "react-native-progress";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getDailyQuote, Quote } from "../utils/motivationalQuotes";
import { getServerDateKey } from "../utils/serverTime";
import { registerForPushNotificationsAsync, retryPendingTokenUpload } from "../utils/notificationService";
<<<<<<< HEAD
import { useTranslation } from "../contexts/LanguageContext";
=======
import CaloriesBurnedCard from "../components/CaloriesBurnedCard";
import AddManualActivityModal from "../components/AddManualActivityModal";
import { syncDailyCalories, getDailyCalorieSummary } from "../services/healthService";
import type { DailyCalorieSummary } from "../types/health";
>>>>>>> 0560ab7cd57fadebeb76119d800b867d95c94748

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { t, language } = useTranslation();

  const [userData, setUserData] = useState<any>(null);
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carb: 0, fat: 0 });
  const [consumed, setConsumed] = useState({ calorie: 0, protein: 0, carb: 0, fat: 0 });
  const [dayOffset, setDayOffset] = useState(0);
  const [waterMap, setWaterMap] = useState<{ [key: string]: number }>({});
  const [water, setWater] = useState(0);
  const [waterTarget, setWaterTarget] = useState(2500);
  const [meals, setMeals] = useState<any>({});

  // Progress tracking state
  const [weightHistory, setWeightHistory] = useState<{ [key: string]: number }>({});
  const [currentWeight, setCurrentWeight] = useState(0);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  // Daily Motivational Quote
  const [dailyQuote, setDailyQuote] = useState<Quote>({ text: "", author: "" });

  // Calories Burned Tracking (NEW!)
  const [caloriesSummary, setCaloriesSummary] = useState<DailyCalorieSummary | null>(null);
  const [isCaloriesLoading, setIsCaloriesLoading] = useState(false);
  const [showManualActivityModal, setShowManualActivityModal] = useState(false);

  // ----------------------------
  // 🔹 DATA LOADING (MAIN MECHANISM)
  // ----------------------------
  // Use useFocusEffect for reliable data refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await loadAllData();
        // Load daily motivational quote using server date
        const serverDate = await getServerDateKey();
        setDailyQuote(getDailyQuote(serverDate));

        // Register for push notifications (non-blocking)
        try {
          await registerForPushNotificationsAsync();
          await retryPendingTokenUpload();
        } catch (error) {
          // Silently fail - notifications are not critical
          console.log('ℹ️ [Dashboard] Notifications unavailable');
        }

        // Load calories summary
        await loadCaloriesSummary();
      };
      loadData();
    }, [dayOffset])
  );


  // Use local date to avoid timezone issues
  const getLocalDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDateKey = () => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return getLocalDateKey(d);
  };

  const loadAllData = async () => {
    const u = await AsyncStorage.getItem("userData");
    if (u) {
      const parsed = JSON.parse(u);
      setUserData(parsed);
      calculateStats(parsed);
      calculateWaterTarget(parsed.weight);

      // Load start date if not set
      const storedStartDate = await AsyncStorage.getItem("goalStartDate");
      if (!storedStartDate) {
        const today = getLocalDateKey(new Date());
        await AsyncStorage.setItem("goalStartDate", today);
        setStartDate(today);
      } else {
        setStartDate(storedStartDate);
      }
    }
    await loadWater();
    await loadIntakeAndMeals();
    await loadWeightHistory();
  };

  const loadWater = async () => {
    const today = getDateKey();
    const stored = await AsyncStorage.getItem("waterData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setWaterMap(parsed);
      setWater(parsed[today] || 0);
    } else {
      setWaterMap({});
      setWater(0);
    }
  };

  // ----------------------------
  // 🔥 MAIN FIX: Reading dailyMeals + dailyIntake
  // ----------------------------
  const loadIntakeAndMeals = async () => {
    const today = getDateKey();
    console.log("📊 [Dashboard] Loading intake for date:", today);

    // --- Calories & Macros ---
    const intake = await AsyncStorage.getItem("dailyIntake");
    console.log("📊 [Dashboard] Raw intake from storage:", intake);

    if (intake) {
      const parsed = JSON.parse(intake);
      console.log("📊 [Dashboard] Parsed intake:", parsed);
      console.log("📊 [Dashboard] Today's intake:", parsed[today]);
      setConsumed(parsed[today] || { calorie: 0, protein: 0, carb: 0, fat: 0 });
    } else {
      console.log("📊 [Dashboard] No intake data found");
      setConsumed({ calorie: 0, protein: 0, carb: 0, fat: 0 });
    }

    // --- Meals ---
    const mealsData = await AsyncStorage.getItem("dailyMeals");
    if (mealsData) {
      const parsedMeals = JSON.parse(mealsData);
      console.log("📊 [Dashboard] Today's meals:", parsedMeals[today]);
      // Returns empty object if no meals
      setMeals(parsedMeals[today] || {});
    } else {
      setMeals({});
    }
  };

  const loadWeightHistory = async () => {
    const stored = await AsyncStorage.getItem("weightHistory");
    if (stored) {
      const parsed = JSON.parse(stored);
      setWeightHistory(parsed);

      // Get most recent weight
      const dates = Object.keys(parsed).sort().reverse();
      if (dates.length > 0) {
        setCurrentWeight(parsed[dates[0]]);
      } else if (userData) {
        setCurrentWeight(userData.weight);
      }
    } else if (userData) {
      setCurrentWeight(userData.weight);
    }
  };

  const logWeight = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid weight");
      return;
    }

    const today = getLocalDateKey(new Date());
    const updated = { ...weightHistory, [today]: weight };

    await AsyncStorage.setItem("weightHistory", JSON.stringify(updated));
    setWeightHistory(updated);
    setCurrentWeight(weight);
    setShowWeightModal(false);
    setWeightInput("");
  };

  // ----------------------------
  // 🔹 Calculations
  // ----------------------------
  const calculateStats = (d: any) => {
    const { gender, age, height, weight, weeklyChange, goal } = d;
    const base =
      gender === "Male"
        ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
        : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;

    const tdeeVal = base * 1.4;
    const adj = (weeklyChange * 7700) / 7;
    const calGoal = goal === "Gain weight" ? tdeeVal + adj : tdeeVal - adj;

    setBmr(Math.round(base));
    setTdee(Math.round(tdeeVal));
    setCalorieGoal(Math.round(calGoal));

    setMacros({
      protein: Math.round((calGoal * 0.3) / 4),
      carb: Math.round((calGoal * 0.45) / 4),
      fat: Math.round((calGoal * 0.25) / 9),
    });
  };

  const calculateWaterTarget = (w: number) => {
    const ml = Math.round((w * 35) / 250) * 250;
    setWaterTarget(ml);
  };

  const updateWater = async (change: number) => {
    const today = getDateKey();
    const newAmt = Math.max(0, (waterMap[today] || 0) + change);
    const updated = { ...waterMap, [today]: newAmt };
    setWaterMap(updated);
    setWater(newAmt);
    await AsyncStorage.setItem("waterData", JSON.stringify(updated));
  };

  // ----------------------------
  // 🔥 CALORIES BURNED TRACKING (NEW!)
  // ----------------------------
  const loadCaloriesSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const summary = await getDailyCalorieSummary(today);
      setCaloriesSummary(summary);
    } catch (error) {
      console.error('Error loading calories summary:', error);
    }
  };

  const handleCaloriesSync = async () => {
    setIsCaloriesLoading(true);
    try {
      const summary = await syncDailyCalories();
      setCaloriesSummary(summary);
    } catch (error) {
      console.error('Error syncing calories:', error);
      Alert.alert('Hata', 'Kalori verisi senkronize edilemedi');
    } finally {
      setIsCaloriesLoading(false);
    }
  };

  const handleManualActivityAdded = async () => {
    setShowManualActivityModal(false);
    await handleCaloriesSync();
  };

  // ----------------------------
  // 🔥 UPDATED: Delete Meal
  // ----------------------------
  const handleDeleteMeal = async (mealType: string, i: number) => {
    const today = getDateKey();

    const mealData = JSON.parse((await AsyncStorage.getItem("dailyMeals")) || "{}");
    const intakeData = JSON.parse((await AsyncStorage.getItem("dailyIntake")) || "{}");

    const arr = mealData[today]?.[mealType] || [];
    const del = arr[i];
    const newArr = arr.filter((_: any, idx: number) => idx !== i);

    mealData[today] = { ...mealData[today], [mealType]: newArr };

    if (del) {
      const c = intakeData[today] || { calorie: 0, protein: 0, carb: 0, fat: 0 };
      c.calorie -= Math.round(del.calorie || 0);
      c.protein -= Math.round(del.protein || 0);
      c.carb -= Math.round(del.carb || 0);
      c.fat -= Math.round(del.fat || 0);

      intakeData[today] = Object.fromEntries(
        Object.entries(c).map(([k, v]) => [k, Math.max(0, Math.round(v as number))])
      );
    }

    await AsyncStorage.setItem("dailyMeals", JSON.stringify(mealData));
    await AsyncStorage.setItem("dailyIntake", JSON.stringify(intakeData));

    setMeals(mealData[today]);
    setConsumed(intakeData[today]);
  };

  const openMealScreen = (mealType: string) =>
    (navigation as any).navigate("AddMeal", { mealType, consumed, calorieGoal });

  const getDayLabel = () => {
    if (dayOffset === 0) return t('dashboard.today');
    if (dayOffset === -1) return t('dashboard.yesterday');
    if (dayOffset === 1) return t('dashboard.tomorrow');
    const days = [
      t('dashboard.sunday'),
      t('dashboard.monday'),
      t('dashboard.tuesday'),
      t('dashboard.wednesday'),
      t('dashboard.thursday'),
      t('dashboard.friday'),
      t('dashboard.saturday')
    ];
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return days[d.getDay()];
  };

  const todayWater = waterMap[getDateKey()] || 0;
  const totalGlasses = Math.ceil(Math.max(waterTarget, todayWater) / 500);

  // Meal keys for navigation (keep English for the API) with translated display names
  const mealKeys = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const getMealTranslation = (key: string) => {
    const translations: { [key: string]: string } = {
      Breakfast: t('dashboard.breakfast'),
      Lunch: t('dashboard.lunch'),
      Dinner: t('dashboard.dinner'),
      Snacks: t('dashboard.snacks'),
    };
    return translations[key] || key;
  };

  const mealTargets: { [key: string]: number } = {
    Breakfast: Math.round(calorieGoal * 0.25),
    Lunch: Math.round(calorieGoal * 0.35),
    Dinner: Math.round(calorieGoal * 0.25),
    Snacks: Math.round(calorieGoal * 0.15),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f8fc" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER */}
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>
          {getDayLabel()},{" "}
          {new Date(new Date().setDate(new Date().getDate() + dayOffset)).toLocaleDateString(
            language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-US',
            { day: "numeric", month: "long" }
          )}
        </Text>

        {/* Day Selector */}
        <View style={styles.daySelector}>
          <TouchableOpacity onPress={() => setDayOffset(dayOffset - 1)}>
            <Ionicons name="chevron-back-outline" size={26} color="#1976d2" />
          </TouchableOpacity>
          <Text style={styles.dayText}>{getDayLabel()}</Text>
          <TouchableOpacity onPress={() => setDayOffset(dayOffset + 1)}>
            <Ionicons name="chevron-forward-outline" size={26} color="#1976d2" />
          </TouchableOpacity>
        </View>

        {/* Daily Motivational Quote */}
        {dailyQuote.text && (
          <View style={styles.quoteCard}>
            <View style={styles.quoteIconContainer}>
              <Ionicons name="sparkles" size={28} color="#ff6f00" />
            </View>
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
              <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
            </View>
          </View>
        )}

        {/* Calories Burned Card (NEW!) */}
        <CaloriesBurnedCard
          summary={caloriesSummary}
          isLoading={isCaloriesLoading}
          onSync={handleCaloriesSync}
          onAddManual={() => setShowManualActivityModal(true)}
          onViewActivities={() => (navigation as any).navigate('ActivityHistory')}
          calorieGoal={500}
        />

        {/* Progress Card */}
        {userData && startDate && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>{t('dashboard.goalProgress')}</Text>

            {/* Weight Progress */}
            <View style={styles.progressRow}>
              <View style={styles.progressStat}>
                <Text style={styles.progressLabel}>{t('dashboard.current')}</Text>
                <Text style={styles.progressValue}>{currentWeight.toFixed(1)} kg</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#1976d2" />
              <View style={styles.progressStat}>
                <Text style={styles.progressLabel}>{t('dashboard.target')}</Text>
                <Text style={styles.progressValue}>{userData.targetWeight} kg</Text>
              </View>
            </View>

            {(() => {
              const startW = userData.weight;
              const targetW = userData.targetWeight;
              const currentW = currentWeight || startW;
              const totalChange = Math.abs(targetW - startW);
              const actualChange = Math.abs(currentW - startW);
              const progressPercent = totalChange > 0 ? (actualChange / totalChange) * 100 : 0;

              // Days calculation
              const start = new Date(startDate);
              const now = new Date();
              const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              const totalWeeks = Math.max(1, Math.ceil(Math.abs(startW - targetW) / userData.weeklyChange));
              const totalDays = totalWeeks * 7;
              const daysRemaining = Math.max(0, totalDays - daysElapsed);

              // Expected vs actual
              const expectedChange = (userData.weeklyChange * daysElapsed) / 7;
              const isGaining = targetW > startW;
              const onTrack = isGaining
                ? (currentW - startW) >= expectedChange * 0.9
                : (startW - currentW) >= expectedChange * 0.9;

              const finishDate = new Date(start);
              finishDate.setDate(start.getDate() + totalDays);

              return (
                <>
                  <Progress.Bar
                    progress={Math.min(progressPercent / 100, 1)}
                    width={300}
                    color={onTrack ? "#4caf50" : "#ff9800"}
                    unfilledColor="#e0e0e0"
                    borderWidth={0}
                    height={16}
                    style={{ marginVertical: 12, borderRadius: 10 }}
                  />

                  <Text style={styles.progressPercentText}>
                    {progressPercent.toFixed(1)}% {t('dashboard.complete')}
                  </Text>

                  {/* Days Info */}
                  <View style={styles.daysRow}>
                    <Text style={styles.daysText}>
                      {t('dashboard.dayOf', { current: daysElapsed, total: totalDays, remaining: daysRemaining })}
                    </Text>
                  </View>

                  <Text style={styles.finishDateText}>
                    {t('dashboard.targetDate')}: {finishDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-US', { month: "short", day: "numeric", year: "numeric" })}
                  </Text>

                  {/* On Track Indicator */}
                  <View style={[styles.trackIndicator, { backgroundColor: onTrack ? "#e8f5e9" : "#fff3e0" }]}>
                    <Ionicons
                      name={onTrack ? "checkmark-circle" : "warning"}
                      size={20}
                      color={onTrack ? "#4caf50" : "#ff9800"}
                    />
                    <Text style={[styles.trackText, { color: onTrack ? "#2e7d32" : "#e65100" }]}>
                      {onTrack ? t('dashboard.onTrack') : t('dashboard.needToCatchUp')}
                    </Text>
                  </View>

                  {/* Log Weight Button */}
                  <TouchableOpacity
                    style={styles.logWeightButton}
                    onPress={() => {
                      setWeightInput(currentWeight.toString());
                      setShowWeightModal(true);
                    }}
                  >
                    <Ionicons name="scale-outline" size={20} color="#1976d2" />
                    <Text style={styles.logWeightText}>{t('dashboard.logWeight')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        )}

        {/* Calorie Card */}
        <View style={styles.calorieCard}>
          <Text style={styles.cardTitle}>{t('dashboard.dailyCalorieGoal')}</Text>
          <Text style={styles.cardValue}>{calorieGoal} kcal</Text>
          <Text style={styles.smallText}>
            {Math.round(consumed.calorie)} / {calorieGoal} kcal
          </Text>
          <Progress.Bar
            key={`calorie-bar-${consumed.calorie}-${calorieGoal}`}
            progress={calorieGoal > 0 ? Math.min(consumed.calorie / calorieGoal, 1) : 0}
            width={300}
            color="#42a5f5"
            unfilledColor="#e0e0e0"
            borderWidth={0}
            height={14}
            style={{ marginVertical: 8, borderRadius: 10 }}
          />
        </View>

        {/* Macros */}
        <View style={styles.macroCard}>
          <Text style={styles.macroTitle}>{t('dashboard.dailyMacros')}</Text>
          <Macro label={t('dashboard.protein')} consumed={consumed.protein} total={macros.protein} color="#ef5350" />
          <Macro label={t('dashboard.carbs')} consumed={consumed.carb} total={macros.carb} color="#ffb74d" />
          <Macro label={t('dashboard.fat')} consumed={consumed.fat} total={macros.fat} color="#8d6e63" />
        </View>

        {/* Meals */}
        <Text style={styles.sectionHeader}>{t('dashboard.meals')}</Text>

        {Object.keys(mealTargets).map((k) => (
          <MealBox
            key={k}
            title={getMealTranslation(k)}
            color="#64b5f6"
            target={mealTargets[k]}
            meals={meals[k] || []}   // 🔥 Empty array if missing
            onAdd={() => openMealScreen(k)}
            onDelete={handleDeleteMeal}
          />
        ))}

        {/* Water Tracking */}
        <View style={styles.waterBox}>
          <Text style={styles.waterTitle}>{t('dashboard.waterTracking')}</Text>
          <Text style={styles.waterValue}>
            {Math.round(todayWater)} / {waterTarget} ml
          </Text>

          <View style={styles.waterButtons}>
            <TouchableOpacity onPress={() => updateWater(-250)}>
              <Ionicons name="remove-circle-outline" size={40} color="#1565c0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => updateWater(250)}>
              <Ionicons name="add-circle-outline" size={40} color="#1565c0" />
            </TouchableOpacity>
          </View>

          <View style={styles.glassRow}>
            {Array.from({ length: totalGlasses }).map((_, i) => {
              const level = (i + 1) * 500;
              const full = todayWater >= level;
              const half = !full && todayWater >= level - 250;
              return (
                <TouchableOpacity key={i} onPress={() => updateWater(250)}>
                  <MaterialCommunityIcons
                    name={full ? "cup-water" : half ? "cup" : "cup-outline"}
                    size={50}
                    color={full || half ? "#29b6f6" : "#b0bec5"}
                    style={{ marginHorizontal: 3 }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>


        {/* Meal Plan Generator */}
        <TouchableOpacity
          style={styles.mealPlanCard}
          onPress={() => (navigation as any).navigate('MealPlan')}
        >
          <View style={styles.exerciseContent}>
            <Ionicons name="restaurant" size={40} color="#4caf50" />
            <View style={styles.exerciseText}>
              <Text style={styles.mealPlanTitle}>{t('dashboard.aiMealPlanner')}</Text>
              <Text style={styles.exerciseSubtitle}>
                {t('dashboard.getPersonalizedPlan')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#4caf50" />
          </View>
        </TouchableOpacity>

        {/* Biceps Curl Tutorial */}
        <TouchableOpacity
          style={styles.tutorialCard}
          onPress={() => (navigation as any).navigate('MuscleGroup')}
        >
          <View style={styles.exerciseContent}>
            <Ionicons name="school" size={40} color="#667eea" />
            <View style={styles.exerciseText}>
              <Text style={styles.tutorialTitle}>{t('dashboard.exerciseTutorials')}</Text>
              <Text style={styles.exerciseSubtitle}>
                {t('dashboard.learnCorrectForm')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#667eea" />
          </View>
        </TouchableOpacity>

        {/* Exercise Evaluation */}
        <TouchableOpacity
          style={styles.exerciseCard}
          onPress={() => (navigation as any).navigate('ExerciseEvaluation')}
        >
          <View style={styles.exerciseContent}>
            <Ionicons name="fitness" size={40} color="#1976d2" />
            <View style={styles.exerciseText}>
              <Text style={styles.exerciseTitle}>{t('dashboard.exerciseEvaluation')}</Text>
              <Text style={styles.exerciseSubtitle}>
                {t('dashboard.analyzeForm')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#1976d2" />
          </View>
        </TouchableOpacity>


        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Weight Logging Modal */}
      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Log Current Weight</Text>

            <TextInput
              style={styles.modalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder="Enter weight (kg)"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowWeightModal(false);
                  setWeightInput("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={logWeight}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Activity Modal (NEW!) */}
      <AddManualActivityModal
        visible={showManualActivityModal}
        onClose={() => setShowManualActivityModal(false)}
        onActivityAdded={handleManualActivityAdded}
      />
    </SafeAreaView>
  );
}

// ----------------------------
// MEALS — MealBox and Macro
// ----------------------------
function Macro({ label, consumed, total, color }: any) {
  const progress = total === 0 ? 0 : consumed / total;
  return (
    <View style={{ width: "100%", marginBottom: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: "#37474f" }}>
        {label} — {Math.round(consumed)} / {Math.round(total)} g
      </Text>
      <Progress.Bar
        progress={progress}
        width={300}
        color={color}
        unfilledColor="#eceff1"
        borderWidth={0}
        height={10}
        style={{ borderRadius: 10 }}
      />
    </View>
  );
}

function MealBox({ title, color, target, onAdd, meals, onDelete }: any) {
  return (
    <View style={[styles.mealBox, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.mealTitle}>{title}</Text>
        <Text style={styles.mealValue}>Recommended: {target} kcal</Text>

        {meals && meals.length > 0 ? (
          meals.map((m: any, i: number) => (
            <View key={i} style={styles.mealItemRow}>
              <Text style={{ fontSize: 13, color: "#555", flex: 1 }}>
                • {m.name || m} ({Math.round(m.calorie)} kcal)
              </Text>
              <TouchableOpacity onPress={() => onDelete(title, i)}>
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: "#999", marginTop: 4 }}>
            No food added yet.
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.mealAddBtn} onPress={onAdd}>
        <Ionicons name="add-circle-outline" size={28} color={color} />
      </TouchableOpacity>
    </View>
  );
}

// ----------------------------
// STYLES
// ----------------------------
const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "700", color: "#1976d2", marginTop: 20 },
  subtitle: { fontSize: 16, color: "#455a64", marginBottom: 15 },
  daySelector: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  dayText: { fontSize: 17, fontWeight: "600", color: "#1565c0" },
  calorieCard: {
    width: "100%",
    backgroundColor: "#e3f2fd",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#0d47a1" },
  cardValue: { fontSize: 34, fontWeight: "800", color: "#1565c0", marginVertical: 4 },
  smallText: { fontSize: 14, color: "#455a64" },
  macroCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 25,
  },
  macroTitle: { fontSize: 19, fontWeight: "700", color: "#263238", marginBottom: 14 },
  sectionHeader: { fontSize: 19, fontWeight: "700", color: "#263238", marginBottom: 10 },
  mealBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    width: "100%",
    borderLeftWidth: 5,
    marginVertical: 6,
  },
  mealTitle: { fontSize: 16, fontWeight: "600", color: "#37474f" },
  mealValue: { fontSize: 13, color: "#607d8b", marginTop: 2 },
  mealAddBtn: { marginLeft: 10, padding: 4 },
  mealItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  waterBox: {
    width: "100%",
    backgroundColor: "#e3f2fd",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
  },
  waterTitle: { fontSize: 18, fontWeight: "700", color: "#1565c0", marginBottom: 4 },
  waterValue: { fontSize: 14, color: "#37474f", marginBottom: 8 },
  waterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 120,
    marginBottom: 8,
  },
  glassRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  mealPlanCard: {
    width: "100%",
    backgroundColor: "#e8f5e9",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  mealPlanTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2e7d32",
  },
  tutorialCard: {
    width: "100%",
    backgroundColor: "#ede7f6",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5e35b1",
  },
  exerciseCard: {
    width: "100%",
    backgroundColor: "#fff3e0",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  exerciseContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseText: {
    flex: 1,
    marginLeft: 14,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e65100",
  },
  exerciseSubtitle: {
    fontSize: 13,
    color: "#607d8b",
    marginTop: 4,
  },
  // Progress Card Styles
  progressCard: {
    width: "100%",
    backgroundColor: "#fff3e0",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e65100",
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  progressStat: {
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    color: "#607d8b",
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e65100",
  },
  progressPercentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#455a64",
    marginTop: 8,
  },
  daysRow: {
    marginTop: 12,
  },
  daysText: {
    fontSize: 14,
    color: "#607d8b",
    textAlign: "center",
  },
  finishDateText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
    marginTop: 8,
  },
  trackIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  trackText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  logWeightButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  logWeightText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1976d2",
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#263238",
    marginBottom: 20,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  modalSaveButton: {
    backgroundColor: "#1976d2",
    marginLeft: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#607d8b",
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Motivational Quote Styles
  quoteCard: {
    width: "100%",
    backgroundColor: "#fff8e1",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 5,
    borderLeftColor: "#ff6f00",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteIconContainer: {
    marginRight: 14,
    marginTop: 2,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#5d4037",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff6f00",
    textAlign: "right",
  },
});
