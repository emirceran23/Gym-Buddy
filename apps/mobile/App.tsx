import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 📱 Screens
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GoalSetupScreen from "./src/screens/GoalSetupScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import AddMealScreen from "./src/screens/AddMealScreen";
import ExerciseEvaluationScreen from "./src/screens/ExerciseEvaluationScreen";
import MealPlanScreen from "./src/screens/MealPlanScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import TutorialDetailScreen from "./src/screens/TutorialDetailScreen";
import { registerForPushNotificationsAsync } from "./src/utils/notificationService";

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
      // Silent fail - notifications are not critical for app functionality
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

        {/* Other screens (opened from Dashboard) */}
        <Stack.Screen name="AddMeal" component={AddMealScreen} />
        <Stack.Screen name="MealPlan" component={MealPlanScreen} />
        <Stack.Screen name="TutorialDetail" component={TutorialDetailScreen} />
        <Stack.Screen name="ExerciseEvaluation" component={ExerciseEvaluationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
