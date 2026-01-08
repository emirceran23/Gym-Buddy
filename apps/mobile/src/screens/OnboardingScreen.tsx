import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../contexts/LanguageContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  background: "#F0F9FF",
  backgroundMid: "#E0F2FE",
  backgroundAccent: "#BAE6FD",
  primary: "#0891B2",
  primaryLight: "#22D3EE",
  accent: "#F97316",
  accentGradient: "#FB923C",
  text: "#0F172A",
  textSecondary: "#475569",
  white: "#FFFFFF",
};

// Floating particle component
const FloatingParticle = ({ delay, startX, startY, size, duration }: any) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.5);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -SCREEN_HEIGHT * 0.4,
            duration: duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.5,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
};

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  // Animation values
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Icon bounces in
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Icon rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Title fades in
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle fades in
    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Button bounces in
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        delay: 900,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        delay: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  // Generate particles
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_WIDTH,
    startY: SCREEN_HEIGHT * 0.5 + Math.random() * SCREEN_HEIGHT * 0.4,
    size: 10 + Math.random() * 15,
    delay: Math.random() * 3000,
    duration: 5000 + Math.random() * 3000,
  }));

  return (
    <View style={styles.container}>
      {/* Background layers */}
      <View style={styles.bgLayer1} />
      <View style={styles.bgLayer2} />
      <View style={styles.bgLayer3} />

      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle
          key={p.id}
          startX={p.startX}
          startY={p.startY}
          size={p.size}
          delay={p.delay}
          duration={p.duration}
        />
      ))}

      {/* Content */}
      <View style={styles.content}>
        {/* Animated Icon with Glow */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.iconGlow,
              {
                transform: [{ scale: glowPulse }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [
                  { scale: iconScale },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={70} color={COLORS.white} />
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          {t("onboarding.welcome")}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          {t("onboarding.subtitle")}
        </Animated.Text>

        {/* Button */}
        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [{ scale: buttonScale }],
          }}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("GoalSetup")}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>{t("onboarding.letsStart")}</Text>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </Animated.View>

        {/* Features dots */}
        <Animated.View
          style={[
            styles.featuresRow,
            {
              opacity: buttonOpacity,
            },
          ]}
        >
          <View style={styles.featureDot}>
            <Ionicons name="barbell-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.featureDot}>
            <Ionicons name="analytics-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.featureDot}>
            <Ionicons name="restaurant-outline" size={22} color={COLORS.primary} />
          </View>
        </Animated.View>

        {/* Feature labels */}
        <Animated.View
          style={[
            styles.featureLabels,
            { opacity: buttonOpacity },
          ]}
        >
          <Text style={styles.featureLabel}>Workouts</Text>
          <Text style={styles.featureLabel}>Analytics</Text>
          <Text style={styles.featureLabel}>Nutrition</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },
  bgLayer2: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: COLORS.backgroundMid,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  bgLayer3: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: COLORS.backgroundAccent,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.5,
  },
  decorCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  decorCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
    bottom: 100,
    left: -50,
  },
  decorCircle3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
    top: 150,
    left: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 40,
  },
  iconGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
    top: -25,
    left: -25,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 45,
    lineHeight: 24,
    paddingHorizontal: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
  },
  featuresRow: {
    flexDirection: "row",
    marginTop: 50,
    gap: 30,
  },
  featureDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  featureLabels: {
    flexDirection: "row",
    marginTop: 12,
    gap: 20,
  },
  featureLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    width: 70,
    textAlign: "center",
  },
  particle: {
    position: "absolute",
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
});
