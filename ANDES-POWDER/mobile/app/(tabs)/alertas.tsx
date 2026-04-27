import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import notificationService from '../../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertsCard from '../../components/AlertsCard';

export default function AlertasScreen() {
  const [snowAlerts, setSnowAlerts] = useState(true);
  const [windAlerts, setWindAlerts] = useState(false);
  const [stormAlerts, setStormAlerts] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadPreferences();
    setupNotifications();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem('notificationPreferences');
      if (prefs) {
        const { snowAlerts: snow, windAlerts: wind, stormAlerts: storm } = JSON.parse(prefs);
        setSnowAlerts(snow);
        setWindAlerts(wind);
        setStormAlerts(storm);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const setupNotifications = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setPermissionGranted(true);
      
      // Save to backend
      await notificationService.savePushToken(token, {
        snowAlerts,
        stormAlerts,
        windAlerts,
      });
    }
  };

  const updatePreference = async (
    key: 'snowAlerts' | 'windAlerts' | 'stormAlerts',
    value: boolean
  ) => {
    const newPrefs = {
      snowAlerts: key === 'snowAlerts' ? value : snowAlerts,
      windAlerts: key === 'windAlerts' ? value : windAlerts,
      stormAlerts: key === 'stormAlerts' ? value : stormAlerts,
    };

    // Update local state
    if (key === 'snowAlerts') setSnowAlerts(value);
    if (key === 'windAlerts') setWindAlerts(value);
    if (key === 'stormAlerts') setStormAlerts(value);

    // Save to AsyncStorage
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPrefs));

    // Update backend
    if (permissionGranted) {
      await notificationService.updatePreferences(newPrefs);
    }
  };

  const testNotification = async () => {
    await notificationService.scheduleTestNotification();
    Alert.alert('Notificación de prueba', 'Recibirás una notificación en 2 segundos');
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Alertas</Text>
          <Text style={styles.subtitle}>Configura tus notificaciones</Text>
        </View>

        {/* Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones de Nieve</Text>
          
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="snow" size={24} color="#63b3ed" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Nevadas Importantes</Text>
              <Text style={styles.alertDescription}>
                Aviso cuando se pronostiquen más de 10cm
              </Text>
            </View>
            <Switch
              value={snowAlerts}
              onValueChange={(value) => updatePreference('snowAlerts', value)}
              trackColor={{ false: '#334155', true: '#63b3ed' }}
              thumbColor={snowAlerts ? '#fff' : '#94a3b8'}
            />
          </View>

          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="thunderstorm" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Tormentas Cruzando</Text>
              <Text style={styles.alertDescription}>
                Alerta cuando hay alta probabilidad de cruce
              </Text>
            </View>
            <Switch
              value={stormAlerts}
              onValueChange={(value) => updatePreference('stormAlerts', value)}
              trackColor={{ false: '#334155', true: '#8b5cf6' }}
              thumbColor={stormAlerts ? '#fff' : '#94a3b8'}
            />
          </View>

          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="flag" size={24} color="#f59e0b" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Viento Extremo</Text>
              <Text style={styles.alertDescription}>
                Aviso cuando el viento supere 60 km/h
              </Text>
            </View>
            <Switch
              value={windAlerts}
              onValueChange={(value) => updatePreference('windAlerts', value)}
              trackColor={{ false: '#334155', true: '#f59e0b' }}
              thumbColor={windAlerts ? '#fff' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Test Notification Button */}
        {permissionGranted && (
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Probar Notificación</Text>
          </TouchableOpacity>
        )}

        {!permissionGranted && (
          <View style={styles.permissionWarning}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.permissionText}>
              Permisos de notificaciones no otorgados. Actívalos en Configuración.
            </Text>
          </View>
        )}

        {/* Active Weather Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertas Meteorológicas Activas</Text>
          <AlertsCard />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 179, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#63b3ed',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
