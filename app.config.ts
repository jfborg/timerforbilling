import type { ExpoConfig } from 'expo/config';

import BRAND from './constants/brand.json';

const config: ExpoConfig = {
  name: BRAND.displayName,
  slug: BRAND.slug,
  scheme: BRAND.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    // Placeholder until the owner confirms a final name and bundle identifier (brief section 12).
    bundleIdentifier: 'app.sealedcodename.ios',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Placeholder until the owner confirms a final name and package id (brief section 12).
    package: 'app.sealedcodename.android',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', 'expo-splash-screen'],
  extra: {
    brandCodename: BRAND.codename,
  },
};

export default config;
