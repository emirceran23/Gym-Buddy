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
 * Request notification permissions for iOS and Android
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (!Device.isDevice) {
        console.log('⚠️ [Notifications] Must use physical device for Push Notifications');
        return null;
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
        // Get FCM token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
            console.error('❌ [Notifications] Project ID not found. Make sure to configure EAS.');
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('✅ [Notifications] FCM Token obtained:', token);

        // Store token locally
        await AsyncStorage.setItem('fcmToken', token);

        // Send token to Cloudflare Worker
        await sendTokenToServer(token);

    } catch (error) {
        console.error('❌ [Notifications] Failed to get token:', error);
        return null;
    }

    // Android-specific channel configuration
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-motivation', {
            name: 'Daily Motivation',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1976d2',
            sound: 'default',
        });
    }

    return token;
}

/**
 * Send FCM token to Cloudflare Worker for storage
 */
async function sendTokenToServer(token: string): Promise<void> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${CLOUDFLARE_WORKER_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log('✅ [Notifications] Token registered with server');
            // Clear any pending uploads on success
            await AsyncStorage.removeItem('pendingTokenUpload');
        } else {
            console.warn('⚠️ [Notifications] Server returned:', response.status);
            await AsyncStorage.setItem('pendingTokenUpload', token);
        }
    } catch (error: any) {
        // Silently fail for network errors - don't spam console
        if (error.name === 'AbortError') {
            console.log('⏱️ [Notifications] Server timeout - will retry later');
        } else {
            console.log('⚠️ [Notifications] Server unavailable - will retry later');
        }
        // Store token locally for retry later
        await AsyncStorage.setItem('pendingTokenUpload', token);
    }
}

/**
 * Retry pending token uploads
 */
export async function retryPendingTokenUpload(): Promise<void> {
    const pendingToken = await AsyncStorage.getItem('pendingTokenUpload');
    if (pendingToken) {
        // Silently retry without logging
        await sendTokenToServer(pendingToken);
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
