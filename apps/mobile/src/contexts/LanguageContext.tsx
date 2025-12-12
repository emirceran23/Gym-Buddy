import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { t, initializeLanguage, setLanguage, getCurrentLanguage, toggleLanguage, getAvailableLanguages } from '../utils/i18n';

// Supported language type
type SupportedLanguage = 'en' | 'tr' | 'es' | 'de';

interface LanguageContextType {
    language: string;
    t: (key: string, options?: Record<string, any>) => string;
    setLanguage: (language: SupportedLanguage) => Promise<void>;
    toggleLanguage: () => Promise<void>;
    availableLanguages: { code: string; name: string; nativeName: string; flag: string }[];
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const [language, setLanguageState] = useState<string>('tr');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const lang = await initializeLanguage();
            setLanguageState(lang);
            setIsLoading(false);
        };
        init();
    }, []);

    const handleSetLanguage = async (lang: SupportedLanguage) => {
        await setLanguage(lang);
        setLanguageState(lang);
    };

    const handleToggleLanguage = async () => {
        const newLang = await toggleLanguage();
        setLanguageState(newLang);
    };

    // Wrapper for t function that forces re-render when language changes
    const translate = (key: string, options?: Record<string, any>): string => {
        return t(key, options);
    };

    const value: LanguageContextType = {
        language,
        t: translate,
        setLanguage: handleSetLanguage,
        toggleLanguage: handleToggleLanguage,
        availableLanguages: getAvailableLanguages(),
        isLoading,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Simple hook for translations only (if you don't need full context)
export const useTranslation = () => {
    const { t, language } = useLanguage();
    return { t, language };
};
