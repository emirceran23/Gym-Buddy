import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Fetch current server date from timeapi.io (more reliable than WorldTimeAPI)
 * Returns date in YYYY-MM-DD format
 */
async function fetchServerDate(): Promise<string | null> {
    try {
        console.log('🌐 [ServerTime] Fetching server date from timeapi.io...');
        const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Istanbul', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // timeapi.io returns: { year: 2025, month: 12, day: 9, ... }
        const dateKey = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;

        console.log(`✅ [ServerTime] Server date fetched successfully: ${dateKey}`);
        return dateKey;
    } catch (error) {
        console.error('❌ [ServerTime] Failed to fetch server date:', error);
        return null;
    }
}

/**
 * Get server date with caching (1 hour validity)
 * Falls back to cached date if API is unavailable
 * Returns date in YYYY-MM-DD format
 */
export async function getServerDateKey(): Promise<string> {
    const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

    try {
        // Check if we have a recent cached date
        const lastFetchTime = await AsyncStorage.getItem('lastServerDateFetch');
        const cachedDate = await AsyncStorage.getItem('lastServerDate');

        if (lastFetchTime && cachedDate) {
            const timeSinceLastFetch = Date.now() - parseInt(lastFetchTime, 10);

            if (timeSinceLastFetch < CACHE_DURATION) {
                console.log(`📦 [ServerTime] Using cached server date: ${cachedDate}`);
                return cachedDate;
            }
        }

        // Fetch fresh server date
        const serverDate = await fetchServerDate();

        if (serverDate) {
            // Cache the new date
            await AsyncStorage.setItem('lastServerDate', serverDate);
            await AsyncStorage.setItem('lastServerDateFetch', Date.now().toString());
            return serverDate;
        }

        // If fetch failed but we have cached data, use it
        if (cachedDate) {
            console.log(`⚠️ [ServerTime] API unavailable, using cached date: ${cachedDate}`);
            return cachedDate;
        }

        // Last resort: use local date with warning
        const localDate = new Date();
        const fallbackDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        console.warn(`⚠️ [ServerTime] Using local device date as fallback: ${fallbackDate}`);
        return fallbackDate;

    } catch (error) {
        console.error('❌ [ServerTime] Error in getServerDateKey:', error);

        // Final fallback to local date
        const localDate = new Date();
        const fallbackDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        return fallbackDate;
    }
}
