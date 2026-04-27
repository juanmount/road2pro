import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
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
