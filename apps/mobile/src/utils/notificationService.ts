import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cloudflare Worker URL
const CLOUDFLARE_WORKER_URL = 'https://gym-buddy-notifications.osmangaziatalay66.workers.dev';

/**
 * Notification service for managing FCM tokens and push notifications
 */

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Setup notification listener that translates quotes to user's language
 * This should be called once when the app starts (e.g., in App.tsx)
 */
export function setupNotificationTranslator(t: (key: string) => string) {
    // Listen for notifications received while app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
        const { data } = notification.request.content;

        // Check if this is a daily quote notification
        if (data.type === 'daily_quote' && data.textKey && data.author) {
            // Cancel the original notification
            await Notifications.dismissNotificationAsync(notification.request.identifier);

            // Translate the quote text
            const translatedText = t(data.textKey as string);
            const author = data.author as string;

            // Show new notification with translated text
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '\ud83d\udcaa ' + t('notifications.dailyMotivation'),
                    body: `"${translatedText}"\n\n— ${author}`,
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null, // Show immediately
            });
        }
    });

    return subscription;
}

/**
 * Request notification permissions for iOS and Android
 * Only registers once per day to prevent duplicate notifications
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (!Device.isDevice) {
        console.log('⚠️ [Notifications] Must use physical device for Push Notifications');
        return null;
    }

    // Check if already registered today to prevent duplicates
    const today = new Date().toISOString().split('T')[0];
    const lastRegistrationDate = await AsyncStorage.getItem('lastNotificationRegistration');
    const existingToken = await AsyncStorage.getItem('fcmToken');

    if (lastRegistrationDate === today && existingToken) {
        console.log('ℹ️ [Notifications] Already registered today, skipping');
        return existingToken;
    }

    // Android-specific channel configuration - MUST be done before requesting permissions
    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('daily-motivation', {
                name: 'Daily Motivation',
                description: 'Receive daily motivational quotes to keep you on track',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1976d2',
                sound: 'default',
                enableLights: true,
                enableVibrate: true,
                showBadge: true,
            });
            console.log('✅ [Notifications] Android channel created');
        } catch (error) {
            console.error('❌ [Notifications] Failed to create Android channel:', error);
        }
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('❌ [Notifications] Permission denied');
        return null;
    }

    try {
        // Get Expo Push Token (works for both iOS and Android)
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
            console.error('❌ [Notifications] Project ID not found. Make sure to configure EAS.');
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('✅ [Notifications] Push Token obtained:', token);

        // Store token locally
        await AsyncStorage.setItem('fcmToken', token);

        // Get user's current language preference
        const userLanguage = await AsyncStorage.getItem('userLanguage') || 'tr'; // Default to Turkish

        // Send token and language to Cloudflare Worker
        await sendTokenToServer(token, userLanguage);

        // Mark as registered today
        await AsyncStorage.setItem('lastNotificationRegistration', today);

    } catch (error) {
        console.error('❌ [Notifications] Failed to get token:', error);
    }

    return token;
}

/**
 * Send FCM token and user's language preference to server for push notification registration
 */
async function sendTokenToServer(token: string, language: string): Promise<void> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${CLOUDFLARE_WORKER_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, language }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log('✅ [Notifications] Token and language registered with server');
            // Clear any pending uploads on success
            await AsyncStorage.removeItem('pendingTokenUpload');
        } else {
            console.warn('⚠️ [Notifications] Server returned:', response.status);
            await AsyncStorage.setItem('pendingTokenUpload', JSON.stringify({ token, language }));
        }
    } catch (error: any) {
        // Silently fail for network errors - don't spam console
        if (error.name === 'AbortError') {
            console.log('⏱️ [Notifications] Server timeout - will retry later');
        } else {
            console.log('⚠️ [Notifications] Server unavailable - will retry later');
        }
        // Store token and language locally for retry later
        await AsyncStorage.setItem('pendingTokenUpload', JSON.stringify({ token, language }));
    }
}

/**
 * Retry pending token uploads
 */
export async function retryPendingTokenUpload(): Promise<void> {
    const pendingData = await AsyncStorage.getItem('pendingTokenUpload');
    if (pendingData) {
        try {
            // Parse the stored data
            const { token, language } = JSON.parse(pendingData);
            // Silently retry without logging
            await sendTokenToServer(token, language);
        } catch (error) {
            // If parse fails, might be old format (just token string)
            // Get language from storage
            const userLanguage = await AsyncStorage.getItem('userLanguage') || 'tr';
            await sendTokenToServer(pendingData, userLanguage);
        }
    }
}

/**
 * Get stored FCM token
 */
export async function getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem('fcmToken');
}

/**
 * Clear stored FCM token (for logout/unregister)
 */
export async function clearToken(): Promise<void> {
    const token = await getStoredToken();
    if (token) {
        // Notify server to remove token
        try {
            await fetch(`${CLOUDFLARE_WORKER_URL}/unregister`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });
            console.log('✅ [Notifications] Token unregistered from server');
        } catch (error) {
            console.error('❌ [Notifications] Failed to unregister token:', error);
        }
    }

    await AsyncStorage.removeItem('fcmToken');
    await AsyncStorage.removeItem('pendingTokenUpload');
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}
