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
import { useLanguage } from "../contexts/LanguageContext";

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { language, setLanguage, availableLanguages, t } = useLanguage();
    const [aboutModalVisible, setAboutModalVisible] = useState(false);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    // Get current language info
    const currentLanguage = availableLanguages.find(lang => lang.code === language);

    const handleResetData = () => {
        Alert.alert(
            t('settings.resetConfirmTitle'),
            t('settings.resetConfirmMessage'),
            [
                {
                    text: t('settings.cancel'),
                    style: "cancel",
                },
                {
                    text: t('settings.reset'),
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
                                t('settings.success'),
                                t('settings.resetSuccess'),
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
                            Alert.alert(t('common.error'), t('settings.resetError'));
                        }
                    },
                },
            ]
        );
    };

    const handleLanguageSelect = async (langCode: string) => {
        await setLanguage(langCode as any);
        setLanguageModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={styles.title}>{t('settings.title')}</Text>

                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setLanguageModalVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="language-outline" size={28} color="#4F46E5" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>{t('settings.appLanguage')}</Text>
                                <Text style={styles.settingSubtitle}>
                                    {currentLanguage?.flag} {currentLanguage?.nativeName}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.account')}</Text>

                    {/* Reset Personal Information */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={handleResetData}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="refresh-circle-outline" size={28} color="#ef5350" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>{t('settings.resetPersonalInfo')}</Text>
                                <Text style={styles.settingSubtitle}>
                                    {t('settings.resetSubtitle')}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.information')}</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setAboutModalVisible(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="information-circle-outline" size={28} color="#42a5f5" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>{t('settings.about')}</Text>
                                <Text style={styles.settingSubtitle}>
                                    {t('settings.aboutSubtitle')}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* Developer Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.developer')}</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate("NotificationTest")}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={28} color="#9c27b0" />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>{t('settings.notificationTest')}</Text>
                                <Text style={styles.settingSubtitle}>
                                    {t('settings.notificationSubtitle')}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#b0bec5" />
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>{t('settings.version')} 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={languageModalVisible}
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.languageModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
                            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                                <Ionicons name="close-circle" size={32} color="#455a64" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.languageList}>
                            {availableLanguages.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.languageItem,
                                        language === lang.code && styles.languageItemSelected,
                                    ]}
                                    onPress={() => handleLanguageSelect(lang.code)}
                                >
                                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                                    <View style={styles.languageTextContainer}>
                                        <Text style={[
                                            styles.languageNativeName,
                                            language === lang.code && styles.languageTextSelected,
                                        ]}>
                                            {lang.nativeName}
                                        </Text>
                                        <Text style={styles.languageName}>{lang.name}</Text>
                                    </View>
                                    {language === lang.code && (
                                        <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

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
                            <Text style={styles.modalTitle}>{t('settings.aboutGymBuddy')}</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <Ionicons name="close-circle" size={32} color="#455a64" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>{t('settings.ourMission')}</Text>
                                <Text style={styles.aboutText}>
                                    {t('settings.missionText')}
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>{t('settings.features')}</Text>
                                <Text style={styles.aboutText}>
                                    {t('settings.featuresText')}
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>{t('settings.ourTeam')}</Text>
                                <Text style={styles.aboutText}>
                                    {t('settings.teamText')}
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>{t('settings.contactUs')}</Text>
                                <Text style={styles.aboutText}>
                                    {t('settings.contactText')}
                                </Text>
                            </View>

                            <View style={styles.aboutSection}>
                                <Text style={styles.aboutTitle}>{t('settings.acknowledgments')}</Text>
                                <Text style={styles.aboutText}>
                                    {t('settings.acknowledgmentsText')}
                                </Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setAboutModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>{t('settings.close')}</Text>
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
    languageModalContent: {
        backgroundColor: "#fff",
        borderRadius: 24,
        width: "90%",
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
    // Language Modal Styles
    languageList: {
        padding: 16,
    },
    languageItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: "#f8fafc",
    },
    languageItemSelected: {
        backgroundColor: "#EEF2FF",
        borderWidth: 2,
        borderColor: "#4F46E5",
    },
    languageFlag: {
        fontSize: 32,
        marginRight: 16,
    },
    languageTextContainer: {
        flex: 1,
    },
    languageNativeName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#263238",
        marginBottom: 2,
    },
    languageName: {
        fontSize: 14,
        color: "#78909c",
    },
    languageTextSelected: {
        color: "#4F46E5",
    },
});
