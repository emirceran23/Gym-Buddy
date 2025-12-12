import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// Import translations
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import es from '../locales/es.json';
import de from '../locales/de.json';

// Supported languages
type SupportedLanguage = 'en' | 'tr' | 'es' | 'de';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'tr', 'es', 'de'];

// Create i18n instance
const i18n = new I18n({
    en,
    tr,
    es,
    de,
});

// Storage key for language preference
const LANGUAGE_KEY = 'user_language';

// Set default locale based on device settings
// Priority: 1. Saved preference, 2. Device locale, 3. Turkish (default)
i18n.defaultLocale = 'tr';
i18n.enableFallback = true;

// Get device's preferred language without expo-localization
const getDeviceLanguage = (): SupportedLanguage => {
    try {
        let deviceLanguage: string | undefined;

        if (Platform.OS === 'ios') {
            deviceLanguage = NativeModules.SettingsManager?.settings?.AppleLocale ||
                NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
        } else if (Platform.OS === 'android') {
            deviceLanguage = NativeModules.I18nManager?.localeIdentifier;
        }

        if (deviceLanguage) {
            const languageCode = deviceLanguage.substring(0, 2).toLowerCase() as SupportedLanguage;
            if (SUPPORTED_LANGUAGES.includes(languageCode)) {
                return languageCode;
            }
        }
    } catch (error) {
        console.log('Could not detect device language:', error);
    }

    return 'tr'; // Default to Turkish
};

// Initialize language from storage or device
export const initializeLanguage = async (): Promise<string> => {
    try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
            i18n.locale = savedLanguage;
            return savedLanguage;
        }
    } catch (error) {
        console.log('Error loading language preference:', error);
    }

    // Fall back to device language
    const deviceLanguage = getDeviceLanguage();
    i18n.locale = deviceLanguage;
    return deviceLanguage;
};

// Get current language
export const getCurrentLanguage = (): string => {
    return i18n.locale;
};

// Set language and save to storage
export const setLanguage = async (language: SupportedLanguage): Promise<void> => {
    i18n.locale = language;
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
        console.log('Error saving language preference:', error);
    }
};

// Toggle between languages (cycles through all supported languages)
export const toggleLanguage = async (): Promise<string> => {
    const currentIndex = SUPPORTED_LANGUAGES.indexOf(i18n.locale as SupportedLanguage);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    const newLanguage = SUPPORTED_LANGUAGES[nextIndex];
    await setLanguage(newLanguage);
    return newLanguage;
};

// Translate function with interpolation support
export const t = (key: string, options?: Record<string, any>): string => {
    return i18n.t(key, options);
};

// Get available languages
export const getAvailableLanguages = () => [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

// Export i18n instance for direct access if needed
export default i18n;
