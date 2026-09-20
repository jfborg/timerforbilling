import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { onNotificationTapped, registerForPushNotificationsAsync } from '../lib/pushNotifications';
import { useAuthStore } from '../store/useAuthStore';

const queryClient = new QueryClient();

function NotificationWiring() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (userId) registerForPushNotificationsAsync(userId);
  }, [userId]);

  useEffect(() => {
    return onNotificationTapped((data) => {
      if (data.letterId) router.push(`/open/${data.letterId}`);
    });
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationWiring />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
