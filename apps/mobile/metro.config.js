const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add platform-specific file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'];

// Platform-specific file resolution
config.resolver.platforms = ['ios', 'android'];

module.exports = config;
