import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, useLanguage } from "../contexts/LanguageContext";

const COLORS = {
  background: "#F0F9FF",
  backgroundMid: "#E0F2FE",
  backgroundAccent: "#BAE6FD",
  primary: "#0891B2",
  primaryLight: "#22D3EE",
  primaryDark: "#0E7490",
  accent: "#F97316",
  accentLight: "#FB923C",
  text: "#0F172A",
  textSecondary: "#475569",
  textLight: "#64748B",
  white: "#FFFFFF",
  border: "#CBD5E1",
  success: "#10B981",
  cardBg: "#FFFFFF",
};

// Custom Slider Component (Pure JS - No Native Module Required)
function CustomSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = COLORS.primary,
  maximumTrackTintColor = "#E2E8F0",
  thumbTintColor = COLORS.accent,
  style,
}: {
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
}) {
  const sliderWidth = useRef(0);
  const sliderX = useRef(0);
  const lastUpdateTime = useRef(0);
  const pendingValue = useRef(value);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getValueFromPosition = (x: number) => {
    if (sliderWidth.current === 0) return value;
    const ratio = Math.max(0, Math.min(1, x / sliderWidth.current));
    const rawValue = minimumValue + ratio * (maximumValue - minimumValue);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(minimumValue, Math.min(maximumValue, parseFloat(steppedValue.toFixed(2))));
  };

  const throttledUpdate = (newValue: number) => {
    pendingValue.current = newValue;
    const now = Date.now();

    if (now - lastUpdateTime.current >= 50) {
      lastUpdateTime.current = now;
      onValueChange(newValue);
    } else {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        onValueChange(pendingValue.current);
        lastUpdateTime.current = Date.now();
      }, 50);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.pageX - sliderX.current;
        const newValue = getValueFromPosition(x);
        lastUpdateTime.current = Date.now();
        onValueChange(newValue);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.pageX - sliderX.current;
        throttledUpdate(getValueFromPosition(x));
      },
      onPanResponderRelease: () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        onValueChange(pendingValue.current);
      },
    })
  ).current;

  const progress = (value - minimumValue) / (maximumValue - minimumValue);

  return (
    <View
      style={[{ height: 40, justifyContent: "center" }, style]}
      onLayout={(e) => {
        sliderWidth.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: maximumTrackTintColor,
          overflow: "hidden",
        }}
        onLayout={(e) => {
          e.target.measure((x, y, width, height, pageX, pageY) => {
            if (pageX !== undefined) sliderX.current = pageX;
            if (width !== undefined && width > 0) sliderWidth.current = width;
          });
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            backgroundColor: minimumTrackTintColor,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${Math.min(100, Math.max(0, progress * 100))}%`,
          marginLeft: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: thumbTintColor,
          elevation: 5,
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
        }}
      />
    </View>
  );
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GoalSetupScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();

  const [step, setStep] = useState(1);
  const [reason, setReason] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<number>(25);
  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(70);
  const [targetWeight, setTargetWeight] = useState<number>(65);
  const [weeklyChange, setWeeklyChange] = useState<number>(0.5);

  const totalSteps = 8;
  const next = () => setStep((prev) => prev + 1);
  const back = () => setStep((prev) => prev - 1);

  // Map display value to internal value for storage
  const goalInternalValues: Record<string, string> = {
    [t('goalSetup.loseWeight')]: "Lose weight",
    [t('goalSetup.gainWeight')]: "Gain weight",
    [t('goalSetup.increaseMuscle')]: "Increase muscle mass",
    [t('goalSetup.reduceBodyFat')]: "Reduce body fat",
  };

  const genderInternalValues: Record<string, string> = {
    [t('goalSetup.female')]: "Female",
    [t('goalSetup.male')]: "Male",
  };

  function calculateNutritionAdvanced({
    gender,
    age,
    height,
    weight,
    goal,
    weeklyChange,
    activityLevel,
  }: any) {
    if (!gender || !age || !height || !weight || !goal) return null;

    const internalGoal = goalInternalValues[goal] || goal;
    const internalGender = genderInternalValues[gender] || gender;

    const bmr =
      internalGender === "Male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    let multiplier = 1.35;
    if (activityLevel === "sedentary") multiplier = 1.2;
    if (activityLevel === "active") multiplier = 1.5;

    const tdee = bmr * multiplier;

    const weeklyDeficit = weeklyChange ? weeklyChange * 7700 : 0;
    const dailyDeficit = weeklyDeficit / 7;

    let targetCalories = tdee;
    if (internalGoal === "Lose weight" || internalGoal === "Reduce body fat")
      targetCalories -= dailyDeficit;
    else if (internalGoal === "Gain weight") targetCalories += dailyDeficit;
    else if (internalGoal === "Increase muscle mass") targetCalories += dailyDeficit / 2;

    const macros: any = {
      "Lose weight": { protein: 0.3, carb: 0.4, fat: 0.3 },
      "Reduce body fat": { protein: 0.35, carb: 0.35, fat: 0.3 },
      "Increase muscle mass": { protein: 0.35, carb: 0.45, fat: 0.2 },
      "Gain weight": { protein: 0.25, carb: 0.55, fat: 0.2 },
      "Maintain my form": { protein: 0.3, carb: 0.45, fat: 0.25 },
    };

    const { protein, carb, fat } = macros[internalGoal] || macros["Maintain my form"];

    const proteinGr = (targetCalories * protein) / 4;
    const carbGr = (targetCalories * carb) / 4;
    const fatGr = (targetCalories * fat) / 9;

    return {
      calories: Math.round(targetCalories),
      protein: Math.round(proteinGr),
      carbs: Math.round(carbGr),
      fat: Math.round(fatGr),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    };
  }

  const handleFinish = async () => {
    const internalGoal = goalInternalValues[goal || ''] || goal;
    const internalGender = genderInternalValues[gender || ''] || gender;

    const userData = {
      reason,
      goal: internalGoal,
      gender: internalGender,
      age,
      height,
      weight,
      targetWeight,
      weeklyChange,
      activityLevel: "sedentary",
    };

    const nutrition = calculateNutritionAdvanced(userData);

    if (!nutrition) {
      console.error(" Failed to calculate nutrition - missing required fields");
      return;
    }

    try {
      await AsyncStorage.setItem(
        "userData",
        JSON.stringify({ ...userData, ...nutrition })
      );
      console.log(" User data saved:", {
        ...userData,
        ...nutrition,
      });
      navigation.navigate("MainTabs");
    } catch (err) {
      console.error(" Failed to save data:", err);
    }
  };

  const totalWeeks = Math.max(
    1,
    Math.ceil(Math.abs(weight - targetWeight) / weeklyChange)
  );
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepCard
            title={t('goalSetup.whyUsingApp')}
            options={[
              t('goalSetup.wantLoseWeight'),
              t('goalSetup.wantBuildMuscle'),
              t('goalSetup.wantLiveHealthier'),
              t('goalSetup.wantMaintainForm'),
            ]}
            icons={["trending-down", "barbell", "heart", "fitness"]}
            selected={reason}
            onSelect={setReason}
            onNext={next}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 2:
        return (
          <StepCard
            title={t('goalSetup.selectGender')}
            options={[t('goalSetup.female'), t('goalSetup.male')]}
            icons={["female", "male"]}
            selected={gender}
            onSelect={setGender}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 3:
        return (
          <ScrollPickerCard
            title={t('goalSetup.selectAge')}
            value={age}
            min={10}
            max={90}
            unit={t('goalSetup.yearsOld') || 'years old'}
            onChange={setAge}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 4:
        return (
          <StepCard
            title={t('goalSetup.whatIsGoal')}
            options={[
              t('goalSetup.loseWeight'),
              t('goalSetup.gainWeight'),
              t('goalSetup.increaseMuscle'),
              t('goalSetup.reduceBodyFat'),
            ]}
            icons={["trending-down", "trending-up", "barbell", "body"]}
            selected={goal}
            onSelect={setGoal}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 5:
        return (
          <ScrollPickerCard
            title={t('goalSetup.selectHeight')}
            value={height}
            min={120}
            max={210}
            unit="cm"
            onChange={setHeight}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 6:
        return (
          <ScrollPickerCard
            title={t('goalSetup.selectWeight')}
            value={weight}
            min={30}
            max={200}
            unit="kg"
            onChange={setWeight}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 7:
        return (
          <ScrollPickerCard
            title={t('goalSetup.selectTargetWeight')}
            value={targetWeight}
            min={30}
            max={200}
            unit="kg"
            onChange={setTargetWeight}
            onNext={next}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
          />
        );
      case 8:
        return (
          <SliderCard
            title={t('goalSetup.weeklyChangeGoal')}
            value={weeklyChange}
            onChange={setWeeklyChange}
            totalWeeks={totalWeeks}
            weight={weight}
            targetWeight={targetWeight}
            onNext={handleFinish}
            onBack={back}
            step={step}
            totalSteps={totalSteps}
            t={t}
            language={language}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background decorations */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Progress Indicator ----
function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(current / total) * 100}%` }
          ]}
        />
      </View>
      <Text style={styles.progressText}>{current} / {total}</Text>
    </View>
  );
}

// ---- StepCard ----
function StepCard({ title, options, icons, selected, onSelect, onNext, onBack, step, totalSteps, t }: any) {
  return (
    <View style={styles.stepContainer}>
      <ProgressIndicator current={step} total={totalSteps} />

      <Text style={styles.title}>{title}</Text>

      {options.map((item: string, index: number) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.option,
            selected === item && styles.optionSelected,
          ]}
          onPress={() => onSelect(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIcon, selected === item && styles.optionIconSelected]}>
            <Ionicons
              name={icons?.[index] || "checkmark"}
              size={22}
              color={selected === item ? COLORS.white : COLORS.primary}
            />
          </View>
          <Text
            style={[
              styles.optionText,
              selected === item && styles.optionTextSelected,
            ]}
          >
            {item}
          </Text>
          {selected === item && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>
      ))}

      <View style={styles.navButtons}>
        {onBack && (
          <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={styles.navBackText}>{t('goalSetup.back')}</Text>
          </TouchableOpacity>
        )}
        {selected && (
          <TouchableOpacity style={[styles.navBtn, styles.navNext]} onPress={onNext}>
            <Text style={styles.navNextText}>{t('goalSetup.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---- ScrollPickerCard ----
function ScrollPickerCard({ title, value, min, max, unit, onChange, onNext, onBack, step, totalSteps, t }: any) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View style={styles.stepContainer}>
      <ProgressIndicator current={step} total={totalSteps} />

      <Text style={styles.title}>{title}</Text>

      <View style={styles.valueDisplay}>
        <Text style={styles.valueNumber}>{value}</Text>
        <Text style={styles.valueUnit}>{unit}</Text>
      </View>

      <View style={styles.pickerBox}>
        <Picker
          selectedValue={value}
          onValueChange={(itemValue) => onChange(itemValue)}
          style={{ width: 200, height: 180, color: '#0F172A' }}
          itemStyle={{ fontSize: 24, color: '#0F172A' }}
          dropdownIconColor="#0F172A"
        >
          {numbers.map((n) => (
            <Picker.Item key={n} label={String(n)} value={n} />
          ))}
        </Picker>
      </View>

      <View style={styles.navButtons}>
        {onBack && (
          <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={styles.navBackText}>{t('goalSetup.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.navBtn, styles.navNext]} onPress={onNext}>
          <Text style={styles.navNextText}>{t('goalSetup.continue')}</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- SliderCard ----
function SliderCard({
  title,
  value,
  onChange,
  totalWeeks,
  onNext,
  onBack,
  weight,
  targetWeight,
  step,
  totalSteps,
  t,
  language,
}: any) {
  const generateSmoothData = () => {
    const diff = targetWeight - weight;
    const safeValue = Math.max(0.1, Math.abs(value));
    const stepCount = Math.min(20, Math.max(2, Math.ceil(Math.abs(diff) / safeValue)));

    const data = [];
    for (let i = 0; i <= stepCount; i++) {
      const ratio = i / stepCount;
      const smoothed = weight + diff * Math.pow(ratio, 1.5);

      if (isNaN(smoothed) || !isFinite(smoothed)) {
        data.push(weight);
      } else {
        data.push(parseFloat(smoothed.toFixed(1)));
      }
    }

    return data.length >= 2 ? data : [weight, targetWeight];
  };

  const getLocale = () => {
    if (language === 'tr') return 'tr-TR';
    if (language === 'de') return 'de-DE';
    if (language === 'es') return 'es-ES';
    return 'en-US';
  };

  const getFinishDate = () => {
    const now = new Date();
    const finish = new Date(now);
    const safeTotalWeeks = Math.max(1, Math.min(200, totalWeeks || 1));
    finish.setDate(now.getDate() + safeTotalWeeks * 7);

    return finish.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const chartData = generateSmoothData();
  const finishDate = getFinishDate();

  return (
    <View style={styles.stepContainer}>
      <ProgressIndicator current={step} total={totalSteps} />

      <Text style={styles.title}>{title}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: [t('goalSetup.start'), "", "", t('goalSetup.target')],
            datasets: [{ data: chartData }],
          }}
          width={SCREEN_WIDTH * 0.85}
          height={200}
          yAxisSuffix="kg"
          withInnerLines={true}
          withOuterLines={false}
          chartConfig={{
            backgroundGradientFrom: COLORS.white,
            backgroundGradientTo: COLORS.backgroundMid,
            color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
            labelColor: () => COLORS.textSecondary,
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: COLORS.primary,
              fill: COLORS.primaryLight,
            },
            propsForBackgroundLines: {
              stroke: "#E2E8F0",
              strokeDasharray: "4 4",
            },
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={{
            marginVertical: 16,
            borderRadius: 16,
            alignSelf: "center",
          }}
        />
      </ScrollView>

      <CustomSlider
        minimumValue={0.25}
        maximumValue={3.0}
        step={0.1}
        value={value}
        onValueChange={onChange}
        style={{ width: "90%", marginVertical: 16 }}
      />

      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Ionicons name="speedometer-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoLabel}>{t('goalSetup.weeklyGoal')}</Text>
          <Text style={styles.infoValue}>{value.toFixed(2)} kg</Text>
        </View>
        <View style={styles.infoBox}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoLabel}>{t('goalSetup.estimatedDuration')}</Text>
          <Text style={styles.infoValue}>{totalWeeks} {t('goalSetup.weeks')}</Text>
        </View>
      </View>

      <View style={styles.finishBox}>
        <Ionicons name="calendar" size={22} color={COLORS.accent} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.finishLabel}>{t('goalSetup.targetDate')}</Text>
          <Text style={styles.finishDate}>{finishDate}</Text>
        </View>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
          <Text style={styles.navBackText}>{t('goalSetup.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, styles.navFinish]} onPress={onNext}>
          <Text style={styles.navNextText}>{t('goalSetup.finish')}</Text>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgDecor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  bgDecor2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.accent,
    opacity: 0.08,
    bottom: 100,
    left: -50,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: SCREEN_HEIGHT * 0.9,
  },
  stepContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 24,
    textAlign: "center",
    color: COLORS.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 6,
    width: "100%",
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundMid,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 10,
  },
  valueNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.primary,
  },
  valueUnit: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: -4,
  },
  pickerBox: {
    borderRadius: 20,
    backgroundColor: COLORS.backgroundMid,
    marginVertical: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  infoBox: {
    flex: 1,
    backgroundColor: COLORS.backgroundMid,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  finishBox: {
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  finishLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  finishDate: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
    marginTop: 2,
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    width: "100%",
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
    gap: 8,
  },
  navNext: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  navFinish: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  navBack: {
    backgroundColor: COLORS.backgroundMid,
  },
  navBackText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  navNextText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
