import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Progress from "react-native-progress";
import { useTranslation } from '../contexts/LanguageContext';

export default function AddMealScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { mealType, consumed: initialConsumed, calorieGoal } = route.params;
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Local state for consumed values to enable real-time updates
  const [consumed, setConsumed] = useState(initialConsumed || { calorie: 0, protein: 0, carb: 0, fat: 0 });
  const API_KEY = "YTvNViohHojFB7f85Mi9DzB2HdlOJpOrmumU2kXa";

  // Load latest intake on mount
  useEffect(() => {
    loadCurrentIntake();
  }, []);

  // Helper function for consistent local date keys
  const getLocalDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadCurrentIntake = async () => {
    try {
      const today = getLocalDateKey();
      const intakeRaw = await AsyncStorage.getItem("dailyIntake");
      if (intakeRaw) {
        const intake = JSON.parse(intakeRaw);
        if (intake[today]) {
          setConsumed(intake[today]);
        }
      }
    } catch (error) {
      console.error("Error loading intake:", error);
    }
  };

  // 🔍 Fetch data from FoodData Central
  const searchFood = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
          query
        )}&pageSize=10&api_key=${API_KEY}`
      );

      // Safe solution for JSON parse error
      const text = await res.text();
      if (text.startsWith("<")) {
        console.error("FDC returned HTML:", text.slice(0, 200));
        setResults([]);
        return;
      }

      const data = JSON.parse(text);
      setResults(data.foods || []);
    } catch (err) {
      console.error("FDC error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchFood(search);
    }, 600);
    return () => clearTimeout(timeout);
  }, [search]);

  // 🔹 Add selected item (UPDATED FULL VERSION)
  const handleAddFood = async (food: any) => {
    try {
      const nutrients = food.foodNutrients || [];
      const energy =
        nutrients.find((n: any) => n.nutrientName.includes("Energy"))?.value || 0;
      const protein =
        nutrients.find((n: any) =>
          n.nutrientName.toLowerCase().includes("protein")
        )?.value || 0;
      const fat =
        nutrients.find((n: any) =>
          n.nutrientName.toLowerCase().includes("total lipid")
        )?.value || 0;
      const carb =
        nutrients.find((n: any) =>
          n.nutrientName.toLowerCase().includes("carbohydrate")
        )?.value || 0;

      const today = getLocalDateKey();
      console.log("📊 [AddMeal] Saving intake for date:", today);

      // --- DAILY INTAKE ---
      const intakeRaw = await AsyncStorage.getItem("dailyIntake");
      const intake = intakeRaw ? JSON.parse(intakeRaw) : {};

      if (!intake[today]) {
        intake[today] = { calorie: 0, protein: 0, carb: 0, fat: 0 };
      }

      intake[today].calorie += energy;
      intake[today].protein += protein;
      intake[today].carb += carb;
      intake[today].fat += fat;

      await AsyncStorage.setItem("dailyIntake", JSON.stringify(intake));

      // 🔥 Update local state immediately for UI refresh
      setConsumed({
        calorie: intake[today].calorie,
        protein: intake[today].protein,
        carb: intake[today].carb,
        fat: intake[today].fat,
      });

      // --- DAILY MEALS ---
      const mealsRaw = await AsyncStorage.getItem("dailyMeals");
      const meals = mealsRaw ? JSON.parse(mealsRaw) : {};

      if (!meals[today]) meals[today] = {};
      if (!meals[today][mealType]) meals[today][mealType] = [];

      meals[today][mealType].push({
        name: food.description,
        calorie: energy,
        protein,
        carb,
        fat,
      });

      await AsyncStorage.setItem("dailyMeals", JSON.stringify(meals));

      Alert.alert(`✅ ${t('addMeal.added')}`, t('addMeal.addedMessage', { food: food.description, meal: mealType }));
    } catch (error) {
      console.error("Add food error:", error);
      Alert.alert(t('addMeal.error'), t('addMeal.unableToAdd'));
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={26}
          color="#1565c0"
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{mealType}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#607d8b"
          style={{ marginHorizontal: 6 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t('addMeal.searchFood')}
          placeholderTextColor="#90a4ae"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Daily Values */}
      <View style={styles.intakeBox}>
        <Text style={styles.intakeTitle}>📊 {t('addMeal.dailyIntake')}</Text>
        <Text style={styles.intakeText}>
          {consumed.calorie} / {calorieGoal} kcal
        </Text>
        <Progress.Bar
          progress={consumed.calorie / calorieGoal}
          width={300}
          color="#42a5f5"
          unfilledColor="#e0e0e0"
          borderWidth={0}
          height={10}
          style={{ marginVertical: 8, borderRadius: 10 }}
        />
        <View style={styles.intakeRow}>
          <Text style={styles.intakeMacro}>{t('addMeal.protein')}: {consumed.protein}g</Text>
          <Text style={styles.intakeMacro}>{t('addMeal.carbs')}: {consumed.carb}g</Text>
          <Text style={styles.intakeMacro}>{t('addMeal.fat')}: {consumed.fat}g</Text>
        </View>
      </View>

      {/* Search Results */}
      <ScrollView contentContainerStyle={styles.resultsContainer}>
        {loading && (
          <ActivityIndicator
            size="large"
            color="#1565c0"
            style={{ marginTop: 20 }}
          />
        )}
        {!loading && results.length === 0 && search.trim() !== "" && (
          <Text style={styles.noResult}>{t('addMeal.noResults')}</Text>
        )}
        {!loading &&
          results.map((food, i) => {
            const energy =
              food.foodNutrients?.find((n: any) =>
                n.nutrientName.includes("Energy")
              )?.value || 0;
            return (
              <TouchableOpacity
                key={i}
                style={styles.foodItem}
                onPress={() => handleAddFood(food)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{food.description}</Text>
                  <Text style={styles.foodBrand}>
                    {food.brandOwner || t('addMeal.generic')} • {Math.round(energy)} kcal
                  </Text>
                </View>
                <Ionicons
                  name="add-circle-outline"
                  size={26}
                  color="#42a5f5"
                />
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafc", paddingTop: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1565c0" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef3f8",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: { flex: 1, height: 40, fontSize: 16, color: "#37474f" },
  intakeBox: {
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
  },
  intakeTitle: { fontSize: 18, fontWeight: "700", color: "#1565c0" },
  intakeText: { fontSize: 15, color: "#37474f", marginTop: 4 },
  intakeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  intakeMacro: { fontSize: 14, color: "#37474f", fontWeight: "500" },
  resultsContainer: { paddingBottom: 80 },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  foodName: { fontSize: 15, fontWeight: "600", color: "#263238" },
  foodBrand: { fontSize: 13, color: "#607d8b", marginTop: 2 },
  noResult: {
    textAlign: "center",
    color: "#607d8b",
    marginTop: 20,
    fontSize: 15,
  },
});
