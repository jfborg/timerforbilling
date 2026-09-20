import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Remote push isn't meaningfully testable here: Expo's managed push service does not support
// web the way it does iOS/Android, and a push token requires a physical device and a real EAS
// project id (Constants.expoConfig.extra.eas.projectId), neither of which exist yet (brief
// section 12, question 3: no Apple/Google developer accounts set up). This degrades to a
// no-op wherever those aren't available, rather than throwing.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return;
  }

  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, expo_push_token: token, platform: Platform.OS },
      { onConflict: 'expo_push_token' }
    );
}

export interface NotificationTapData {
  letterId?: string;
  type?: 'unlock_ready' | 'letter_claimed';
}

/** Registers a listener for notification taps; call once, e.g. from the root layout. Returns
 * an unsubscribe function. */
export function onNotificationTapped(handler: (data: NotificationTapData) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data as NotificationTapData);
  });
  return () => subscription.remove();
}
