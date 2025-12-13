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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../contexts/LanguageContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Floating particle component
const FloatingParticle = ({ delay, startX, startY, size, duration }: any) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      // Reset values
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.5);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Float up
          Animated.timing(translateY, {
            toValue: -SCREEN_HEIGHT * 0.4,
            duration: duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Slight horizontal drift
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          // Fade in then out
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
          ]),
          // Scale up
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
    // Staggered entrance animations
    Animated.sequence([
      // Icon bounces in
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

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
          toValue: 1.2,
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
    outputRange: ["-10deg", "10deg"],
  });

  // Generate particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_WIDTH,
    startY: SCREEN_HEIGHT * 0.5 + Math.random() * SCREEN_HEIGHT * 0.4,
    size: 8 + Math.random() * 12,
    delay: Math.random() * 3000,
    duration: 4000 + Math.random() * 3000,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
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
              <Ionicons name="fitness" size={80} color="#fff" />
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
              <LinearGradient
                colors={["#00b894", "#00cec9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{t("onboarding.letsStart")}</Text>
                <Ionicons name="arrow-forward" size={22} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
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
              <Ionicons name="restaurant-outline" size={20} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={styles.featureDot}>
              <Ionicons name="barbell-outline" size={20} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={styles.featureDot}>
              <Ionicons name="analytics-outline" size={20} color="rgba(255,255,255,0.9)" />
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 40,
  },
  iconGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.2)",
    top: -30,
    left: -30,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 50,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  button: {
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
  },
  featuresRow: {
    flexDirection: "row",
    marginTop: 60,
    gap: 20,
  },
  featureDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
});
