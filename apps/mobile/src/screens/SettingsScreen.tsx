import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const [aboutModalVisible, setAboutModalVisible] = useState(false);

    const handleResetData = () => {
        Alert.alert(
            "Reset Personal Information",
            "Are you sure you want to reset all your personal information? This will restart the app setup process.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Clear all user data
                            await AsyncStorage.multiRemove([
                                "userData",
                                "dailyIntake",
                                "dailyMeals",
                                "waterData",
                            ]);

                            Alert.alert(
                                "Success",
                                "Your data has been reset. You will now be redirected to the onboarding screen.",
                                [
                                    {
                                        text: "OK",
                                        onPress: () => {
                                            // Navigate to Onboarding screen
                                            navigation.reset({
                                                index: 0,
                                                routes: [{ name: "Onboarding" }],
                                            });
                                        },
                                    },
                                ]
                            );
                        } catch (error) {
                            console.error("Error resetting data:", error);
                            Alert.alert("Error", "Failed to reset data. Please try again.");
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={styles.title}>⚙️ Settings</Text>

                {/* Settings Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    {/* Reset Personal Information */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={handleResetData}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="refresh-circle-outline" size={28} color="#ef5350" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>Reset Personal Information</Text>
                                <Text style={styles.settingSubtitle}>
                                    Clear all data and start over
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Information</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setAboutModalVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="information-circle-outline" size={28} color="#42a5f5" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>About</Text>
                                <Text style={styles.settingSubtitle}>
                                    Learn more about this app
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* About Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={aboutModalVisible}
                onRequestClose={() => setAboutModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>About Gym Buddy</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <Ionicons name="close-circle" size={32} color="#455a64" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>🎯 Our Mission</Text>
                                <Text style={styles.aboutText}>
                                    Gym Buddy is your personal fitness and nutrition companion,
                                    designed to help you achieve your health goals through
                                    intelligent meal planning and exercise tracking.
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>✨ Features</Text>
                                <Text style={styles.aboutText}>
                                    • Personalized calorie and macro tracking{"\n"}
                                    • AI-powered meal plan generation{"\n"}
                                    • Exercise form analysis with AI{"\n"}
                                    • Daily water intake tracking{"\n"}
                                    • Progress monitoring and insights
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>👥 Our Team</Text>
                                <Text style={styles.aboutText}>
                                    Developed with passion by a team dedicated to making fitness
                                    and nutrition accessible to everyone. We combine cutting-edge
                                    AI technology with proven nutritional science to deliver a
                                    comprehensive health platform.
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>📧 Contact Us</Text>
                                <Text style={styles.aboutText}>
                                    Have questions or feedback? We'd love to hear from you!{"\n\n"}
                                    Email: support@gymbuddy.app{"\n"}
                                    Website: www.gymbuddy.app
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>🙏 Acknowledgments</Text>
                                <Text style={styles.aboutText}>
                                    Thank you for choosing Gym Buddy as your fitness companion.
                                    Your health journey is our priority, and we're committed to
                                    supporting you every step of the way.
                                </Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setAboutModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f8fc",
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1976d2",
        marginTop: 20,
        marginBottom: 30,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#607d8b",
        marginBottom: 12,
        marginLeft: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    settingTextContainer: {
        marginLeft: 14,
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#263238",
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: "#78909c",
    },
    versionContainer: {
        alignItems: "center",
        marginTop: 30,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 14,
        color: "#90a4ae",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 24,
        width: "90%",
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#eceff1",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1976d2",
    },
    modalBody: {
        padding: 20,
    },
    aboutSection: {
        marginBottom: 24,
    },
    aboutTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#263238",
        marginBottom: 8,
    },
    aboutText: {
        fontSize: 15,
        color: "#546e7a",
        lineHeight: 22,
    },
    closeButton: {
        backgroundColor: "#1976d2",
        borderRadius: 12,
        padding: 16,
        margin: 20,
        alignItems: "center",
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
