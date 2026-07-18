import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          backgroundColor: Platform.OS === 'android' ? 'rgba(8, 20, 40, 0.97)' : 'transparent',
          borderTopWidth: Platform.OS === 'android' ? 1 : 0,
          borderTopColor: Platform.OS === 'android' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
          height: Platform.OS === 'ios' ? 88 : 72 + bottomInset,
          paddingBottom: Platform.OS === 'android' ? 8 + bottomInset : 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8, 20, 40, 0.97)' }]} />
          ),
        tabBarActiveTintColor: '#63b3ed',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden redirect
        }}
      />
      <Tabs.Screen
        name="cerros"
        options={{
          title: 'Cerros',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'snow' : 'snow-outline'} 
              size={size} 
              color={color}
              style={focused ? styles.iconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="radares"
        options={{
          title: 'Radares',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'analytics' : 'analytics-outline'} 
              size={size} 
              color={color}
              style={focused ? styles.iconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapas"
        options={{
          title: 'PRO',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'lock-open' : 'lock-open-outline'} 
              size={size} 
              color={color}
              style={focused ? styles.iconGlow : undefined}
            />
          ),
          tabBarBadge: '🔓',
          tabBarBadgeStyle: {
            backgroundColor: '#10b981',
            fontSize: 10,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          },
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'notifications' : 'notifications-outline'} 
              size={size} 
              color={color}
              style={focused ? styles.iconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color}
              style={focused ? styles.iconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="resort"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconGlow: {
    shadowColor: '#63b3ed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
});
