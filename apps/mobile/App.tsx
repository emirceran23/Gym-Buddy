import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import OnboardingScreen from "./src/screens/OnboardingScreen";
import GoalSetupScreen from "./src/screens/GoalSetupScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import TrainingScreen from "./src/screens/TrainingScreen";
import AddMealScreen from "./src/screens/AddMealScreen";
import ExerciseEvaluationScreen from "./src/screens/ExerciseEvaluationScreen";
import MealPlanScreen from "./src/screens/MealPlanScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import TutorialDetailScreen from "./src/screens/TutorialDetailScreen";
import TutorialListScreen from "./src/screens/TutorialListScreen";
import MuscleGroupScreen from "./src/screens/MuscleGroupScreen";
import ExerciseListScreen from "./src/screens/ExerciseListScreen";
import NotificationTestScreen from "./src/screens/NotificationTestScreen";
import ActivityHistoryScreen from "./src/screens/ActivityHistoryScreen";
import { registerForPushNotificationsAsync, setupNotificationTranslator } from "./src/utils/notificationService";
import { LanguageProvider, useTranslation } from "./src/contexts/LanguageContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator Component
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Training") {
            iconName = focused ? "fitness" : "fitness-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#1976d2",
        tabBarInactiveTintColor: "#78909c",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#eceff1",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="Training"
        component={TrainingScreen}
        options={{ tabBarLabel: "Training" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Onboarding");

  useEffect(() => {
    checkUserData();
    // Register for push notifications on app startup
    registerForPushNotificationsAsync().catch((error) => {
      console.log("ℹ️ [App] Notification registration skipped:", error?.message);
    });
  }, []);

  const checkUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        // User has already set up their profile, go straight to Dashboard
        setInitialRoute("MainTabs");
      } else {
        // New user, show onboarding
        setInitialRoute("Onboarding");
      }
    } catch (error) {
      console.error("Error checking user data:", error);
      setInitialRoute("Onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AppContent initialRoute={initialRoute} />
    </LanguageProvider>
  );
}

// Separate component that has access to translation context
function AppContent({ initialRoute }: { initialRoute: string }) {
  const { t } = useTranslation();

  // Set up notification translator (runs when t changes, i.e., language changes)
  useEffect(() => {
    const subscription = setupNotificationTranslator(t);
    return () => subscription.remove();
  }, [t]);
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Onboarding screens */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />

        {/* Main app with bottom tabs */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Other screens (opened from Training or Dashboard) */}
        <Stack.Screen name="AddMeal" component={AddMealScreen} />
        <Stack.Screen name="MealPlan" component={MealPlanScreen} />
        <Stack.Screen name="MuscleGroup" component={MuscleGroupScreen} />
        <Stack.Screen name="ExerciseList" component={ExerciseListScreen} />
        <Stack.Screen name="TutorialList" component={TutorialListScreen} />
        <Stack.Screen name="TutorialDetail" component={TutorialDetailScreen} />
        <Stack.Screen name="ExerciseEvaluation" component={ExerciseEvaluationScreen} />
        <Stack.Screen name="NotificationTest" component={NotificationTestScreen} />
        <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
