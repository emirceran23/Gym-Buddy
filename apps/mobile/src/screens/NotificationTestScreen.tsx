import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import {
    registerForPushNotificationsAsync,
    getStoredToken,
    areNotificationsEnabled,
} from "../utils/notificationService";

export default function NotificationTestScreen({ navigation }: any) {
    const [token, setToken] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>("unknown");
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
    };

    useEffect(() => {
        checkNotificationStatus();

        // Listen for incoming notifications
        const notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                addLog(`📬 Notification received: ${notification.request.content.title}`);
                Alert.alert(
                    "Notification Received!",
                    `Title: ${notification.request.content.title}\nBody: ${notification.request.content.body}`
                );
            }
        );

        // Listen for notification interactions
        const responseListener =
            Notifications.addNotificationResponseReceivedListener((response) => {
                addLog(`👆 Notification tapped: ${response.notification.request.content.title}`);
            });

        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, []);

    const checkNotificationStatus = async () => {
        addLog("Checking notification status...");

        // Check permission
        const enabled = await areNotificationsEnabled();
        setPermissionStatus(enabled ? "granted" : "denied");
        addLog(`Permission status: ${enabled ? "granted" : "denied"}`);

        // Get stored token
        const storedToken = await getStoredToken();
        setToken(storedToken);
        if (storedToken) {
            addLog(`Stored token found: ${storedToken.substring(0, 30)}...`);
        } else {
            addLog("No stored token found");
        }
    };

    const handleRegisterToken = async () => {
        setIsLoading(true);
        addLog("🔄 Registering for push notifications...");

        try {
            const newToken = await registerForPushNotificationsAsync();
            if (newToken) {
                setToken(newToken);
                addLog(`✅ Token registered: ${newToken.substring(0, 30)}...`);
                await checkNotificationStatus();
            } else {
                addLog("❌ Failed to get token");
            }
        } catch (error: any) {
            addLog(`❌ Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const sendTestNotification = async () => {
        addLog("📤 Scheduling test notification...");

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🏋️ GymBuddy Test",
                    body: "This is a test notification! If you see this, notifications are working!",
                    data: { type: "test", timestamp: Date.now() },
                    sound: "default",
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 2,
                },
            });
            addLog("✅ Test notification scheduled (2 seconds)");
            Alert.alert("Success", "Test notification will appear in 2 seconds!");
        } catch (error: any) {
            addLog(`❌ Failed to schedule: ${error.message}`);
            Alert.alert("Error", error.message);
        }
    };

    const sendImmediateNotification = async () => {
        addLog("📤 Sending immediate notification...");

        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🔔 Immediate Notification",
                    body: "This notification was sent immediately!",
                    data: { type: "immediate-test" },
                    sound: "default",
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 1,
                },
            });
            addLog(`✅ Immediate notification sent, ID: ${id}`);
        } catch (error: any) {
            addLog(`❌ Failed: ${error.message}`);
            Alert.alert("Error", error.message);
        }
    };

    const copyTokenToClipboard = async () => {
        if (token) {
            // Using Alert as a fallback since Clipboard might not be available
            Alert.alert("Push Token", token, [{ text: "OK" }]);
            addLog("📋 Token displayed in alert");
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Test</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📊 Status</Text>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Platform:</Text>
                        <Text style={styles.statusValue}>{Platform.OS} {Platform.Version}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Permission:</Text>
                        <View style={[styles.badge, permissionStatus === "granted" ? styles.badgeSuccess : styles.badgeError]}>
                            <Text style={styles.badgeText}>{permissionStatus}</Text>
                        </View>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Token:</Text>
                        <Text style={styles.statusValue}>
                            {token ? `${token.substring(0, 25)}...` : "Not registered"}
                        </Text>
                    </View>

                    {token && (
                        <TouchableOpacity style={styles.copyButton} onPress={copyTokenToClipboard}>
                            <Ionicons name="copy-outline" size={16} color="#4F46E5" />
                            <Text style={styles.copyButtonText}>View Full Token</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Actions Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🧪 Test Actions</Text>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={handleRegisterToken}
                        disabled={isLoading}
                    >
                        <Ionicons name="key-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                            {isLoading ? "Registering..." : "Register / Refresh Token"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={sendTestNotification}
                    >
                        <Ionicons name="notifications-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Send Test (2s delay)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.accentButton]}
                        onPress={sendImmediateNotification}
                    >
                        <Ionicons name="flash-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Send Immediate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.outlineButton]}
                        onPress={checkNotificationStatus}
                    >
                        <Ionicons name="refresh-outline" size={20} color="#4F46E5" />
                        <Text style={[styles.actionButtonText, { color: "#4F46E5" }]}>
                            Refresh Status
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Logs Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📋 Activity Log</Text>
                    <View style={styles.logsContainer}>
                        {logs.length === 0 ? (
                            <Text style={styles.emptyLog}>No activity yet...</Text>
                        ) : (
                            logs.map((log, index) => (
                                <Text key={index} style={styles.logEntry}>
                                    {log}
                                </Text>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 16,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    statusLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    statusValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "600",
        maxWidth: "60%",
        textAlign: "right",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: "#D1FAE5",
    },
    badgeError: {
        backgroundColor: "#FEE2E2",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#065F46",
    },
    copyButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        paddingVertical: 8,
        backgroundColor: "#EEF2FF",
        borderRadius: 8,
    },
    copyButtonText: {
        marginLeft: 6,
        fontSize: 14,
        color: "#4F46E5",
        fontWeight: "600",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    primaryButton: {
        backgroundColor: "#4F46E5",
    },
    secondaryButton: {
        backgroundColor: "#10B981",
    },
    accentButton: {
        backgroundColor: "#F59E0B",
    },
    outlineButton: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#4F46E5",
    },
    actionButtonText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: "600",
        color: "#fff",
    },
    logsContainer: {
        backgroundColor: "#1E293B",
        borderRadius: 8,
        padding: 12,
        maxHeight: 200,
    },
    emptyLog: {
        color: "#64748B",
        fontStyle: "italic",
        textAlign: "center",
    },
    logEntry: {
        color: "#10B981",
        fontSize: 12,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        marginBottom: 4,
    },
});
