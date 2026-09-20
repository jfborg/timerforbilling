import type { ExpoConfig } from 'expo/config';

import BRAND from './constants/brand.json';

// The domain letter links live on (brief section 12, question 1: not chosen yet). Universal
// links / app links only verify against a real, owned, HTTPS-reachable domain serving the
// matching .well-known files (see web/well-known/README.md), so these stay placeholders,
// same as the bundle identifier and package below, until the owner picks one.
const linkHost = new URL(BRAND.linkBaseUrl).host;

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
    associatedDomains: [`applinks:${linkHost}`],
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
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: linkHost, pathPrefix: '/l' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', 'expo-splash-screen', 'expo-notifications'],
  extra: {
    brandCodename: BRAND.codename,
  },
};

export default config;
