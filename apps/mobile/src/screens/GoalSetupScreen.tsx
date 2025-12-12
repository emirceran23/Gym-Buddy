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
import { useTranslation, useLanguage } from "../contexts/LanguageContext";

// Custom Slider Component (Pure JS - No Native Module Required)
function CustomSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = "#00b894",
  maximumTrackTintColor = "#cfd8dc",
  thumbTintColor = "#1565c0",
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

    // Throttle updates to every 50ms to prevent rapid re-renders
    if (now - lastUpdateTime.current >= 50) {
      lastUpdateTime.current = now;
      onValueChange(newValue);
    } else {
      // Schedule a final update if we're throttling
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
        // Ensure final value is applied
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
          height: 6,
          borderRadius: 3,
          backgroundColor: maximumTrackTintColor,
          overflow: "hidden",
        }}
        onLayout={(e) => {
          // Update sliderX with the absolute position
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
          marginLeft: -12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: thumbTintColor,
          elevation: 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
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

  // 🔹 Advanced Nutrition Calculator Function
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

    // Convert translated goal to internal English value
    const internalGoal = goalInternalValues[goal] || goal;
    const internalGender = genderInternalValues[gender] || gender;

    // 1️⃣ Calculate BMR (Mifflin-St Jeor)
    const bmr =
      internalGender === "Male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    // 2️⃣ Activity multiplier
    let multiplier = 1.35;
    if (activityLevel === "sedentary") multiplier = 1.2;
    if (activityLevel === "active") multiplier = 1.5;

    const tdee = bmr * multiplier;

    // 3️⃣ Weekly weight change → calorie difference
    const weeklyDeficit = weeklyChange ? weeklyChange * 7700 : 0;
    const dailyDeficit = weeklyDeficit / 7;

    // 4️⃣ Direction based on goal
    let targetCalories = tdee;
    if (internalGoal === "Lose weight" || internalGoal === "Reduce body fat")
      targetCalories -= dailyDeficit;
    else if (internalGoal === "Gain weight") targetCalories += dailyDeficit;
    else if (internalGoal === "Increase muscle mass") targetCalories += dailyDeficit / 2;

    // 5️⃣ Macro ratios
    const macros: any = {
      "Lose weight": { protein: 0.3, carb: 0.4, fat: 0.3 },
      "Reduce body fat": { protein: 0.35, carb: 0.35, fat: 0.3 },
      "Increase muscle mass": { protein: 0.35, carb: 0.45, fat: 0.2 },
      "Gain weight": { protein: 0.25, carb: 0.55, fat: 0.2 },
      "Maintain my form": { protein: 0.3, carb: 0.45, fat: 0.25 },
    };

    const { protein, carb, fat } =
      macros[internalGoal] || macros["Maintain my form"];

    // 6️⃣ Convert to grams
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

  // 🔹 Finish and Save
  const handleFinish = async () => {
    // Store internal English values for consistent calculations
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
      activityLevel: "sedentary", // fixed for now
    };

    const nutrition = calculateNutritionAdvanced(userData);

    if (!nutrition) {
      console.error("❌ Failed to calculate nutrition - missing required fields");
      return;
    }

    try {
      await AsyncStorage.setItem(
        "userData",
        JSON.stringify({ ...userData, ...nutrition })
      );
      console.log("✅ User data saved:", {
        ...userData,
        ...nutrition,
      });
      navigation.navigate("MainTabs");
    } catch (err) {
      console.error("❌ Failed to save data:", err);
    }
  };

  // 🔹 Target Duration (weeks)
  const totalWeeks = Math.max(
    1,
    Math.ceil(Math.abs(weight - targetWeight) / weeklyChange)
  );

  // 🔹 Render Step
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
            selected={reason}
            onSelect={setReason}
            onNext={next}
            t={t}
          />
        );
      case 2:
        return (
          <StepCard
            title={t('goalSetup.selectGender')}
            options={[t('goalSetup.female'), t('goalSetup.male')]}
            selected={gender}
            onSelect={setGender}
            onNext={next}
            onBack={back}
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
            onChange={setAge}
            onNext={next}
            onBack={back}
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
            selected={goal}
            onSelect={setGoal}
            onNext={next}
            onBack={back}
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
            onChange={setHeight}
            onNext={next}
            onBack={back}
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
            onChange={setWeight}
            onNext={next}
            onBack={back}
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
            onChange={setTargetWeight}
            onNext={next}
            onBack={back}
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- StepCard ----
function StepCard({ title, options, selected, onSelect, onNext, onBack, t }: any) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{title}</Text>
      {options.map((item: string) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.option,
            selected === item && styles.optionSelected,
          ]}
          onPress={() => onSelect(item)}
        >
          <Text
            style={[
              styles.optionText,
              selected === item && styles.optionTextSelected,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.navButtons}>
        {onBack && (
          <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
            <Text style={styles.navBtnText}>{t('goalSetup.back')}</Text>
          </TouchableOpacity>
        )}
        {selected && (
          <TouchableOpacity style={[styles.navBtn, styles.navNext]} onPress={onNext}>
            <Text style={styles.navBtnText}>{t('goalSetup.continue')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---- ScrollPickerCard ----
function ScrollPickerCard({ title, value, min, max, onChange, onNext, onBack, t }: any) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.pickerBox}>
        <Picker
          selectedValue={value}
          onValueChange={(itemValue) => onChange(itemValue)}
          style={{ width: 200, height: 200 }}
          itemStyle={{ fontSize: 22 }}
        >
          {numbers.map((n) => (
            <Picker.Item key={n} label={String(n)} value={n} />
          ))}
        </Picker>
      </View>

      <View style={styles.navButtons}>
        {onBack && (
          <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
            <Text style={styles.navBtnText}>{t('goalSetup.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.navBtn, styles.navNext]} onPress={onNext}>
          <Text style={styles.navBtnText}>{t('goalSetup.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- SliderCard (Responsive Professional Chart + Finish Date) ----
function SliderCard({
  title,
  value,
  onChange,
  totalWeeks,
  onNext,
  onBack,
  weight,
  targetWeight,
  t,
  language,
}: any) {
  const generateSmoothData = () => {
    const diff = targetWeight - weight;

    // Prevent division by zero or very small values
    const safeValue = Math.max(0.1, Math.abs(value));

    // Cap step count to prevent too many data points
    const stepCount = Math.min(20, Math.max(2, Math.ceil(Math.abs(diff) / safeValue)));

    const data = [];
    for (let i = 0; i <= stepCount; i++) {
      const ratio = i / stepCount;
      const smoothed = weight + diff * Math.pow(ratio, 1.5);

      // Ensure valid number
      if (isNaN(smoothed) || !isFinite(smoothed)) {
        data.push(weight);
      } else {
        data.push(parseFloat(smoothed.toFixed(1)));
      }
    }

    // Ensure at least 2 data points
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

    // Ensure totalWeeks is valid
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
      <Text style={styles.title}>{title}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: [t('goalSetup.start'), "1/3", "2/3", t('goalSetup.target')],
            datasets: [{ data: chartData }],
          }}
          width={SCREEN_WIDTH * 0.9}
          height={240}
          yAxisSuffix="kg"
          withInnerLines={true}
          withOuterLines={false}
          chartConfig={{
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#f4f7fb",
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            labelColor: () => "#37474f",
            propsForDots: {
              r: "5",
              strokeWidth: "2",
              stroke: "#0288d1",
              fill: "#b3e5fc",
            },
            propsForBackgroundLines: {
              stroke: "#e0e0e0",
              strokeDasharray: "3 3",
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
        minimumTrackTintColor="#00b894"
        maximumTrackTintColor="#cfd8dc"
        thumbTintColor="#1565c0"
        style={{ width: "90%", marginVertical: 10 }}
      />

      <Text style={styles.info}>
        {t('goalSetup.weeklyGoal')}: <Text style={styles.bold}>{value.toFixed(2)} kg</Text>
      </Text>
      <Text style={styles.info}>
        {t('goalSetup.estimatedDuration')}: <Text style={styles.bold}>{totalWeeks} {t('goalSetup.weeks')}</Text>
      </Text>

      <View style={styles.finishBox}>
        <Text style={styles.finishLabel}>{t('goalSetup.targetDate')}</Text>
        <Text style={styles.finishDate}>{finishDate}</Text>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={[styles.navBtn, styles.navBack]} onPress={onBack}>
          <Text style={styles.navBtnText}>{t('goalSetup.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBtn, styles.navNext]} onPress={onNext}>
          <Text style={styles.navBtnText}>{t('goalSetup.finish')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9f9f9" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: SCREEN_HEIGHT * 0.9,
  },
  stepContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#2d3436",
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: "#00b894",
    borderColor: "#00b894",
  },
  optionText: { fontSize: 16, color: "#2d3436" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  pickerBox: {
    borderRadius: 16,
    backgroundColor: "#ecf0f1",
    marginVertical: 20,
  },
  info: { fontSize: 16, marginTop: 10, color: "#2d3436" },
  bold: { fontWeight: "700", color: "#0984e3" },
  finishBox: {
    marginTop: 15,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  finishLabel: { fontSize: 14, color: "#1565c0", fontWeight: "600" },
  finishDate: { fontSize: 16, fontWeight: "700", color: "#0d47a1" },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    width: "100%",
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "48%",
    alignItems: "center",
  },
  navNext: { backgroundColor: "#0984e3" },
  navBack: { backgroundColor: "#b2bec3" },
  navBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
