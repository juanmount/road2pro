import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import notificationService from '../services/notifications';
import { initMeta } from '../services/meta';
import { Platform } from 'react-native';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import Constants from 'expo-constants';

export let devBypassActive = false;
export function setDevBypass(v: boolean) { devBypassActive = v; }

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await initMeta();
      } catch {}
      
      if (Platform.OS === 'ios') {
        let { status } = await getTrackingPermissionsAsync();
        if (status !== 'granted') {
          const res = await requestTrackingPermissionsAsync();
          status = res.status;
        }
        if (Constants?.appOwnership !== 'expo') {
          try {
            const { Settings } = await import('react-native-fbsdk-next');
            Settings.setAdvertiserTrackingEnabled(status === 'granted');
          } catch {}
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup && !devBypassActive) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      notificationService.initialize(user.uid);
    }
  }, [user]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen 
        name="auth/login" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="auth/signup" 
        options={{ 
          title: 'Sign Up',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
