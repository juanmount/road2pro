import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import notificationService, { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notifications';

export default function AlertasScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadPreferences();
    setupNotifications();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const setupNotifications = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setPermissionGranted(true);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    try {
      await notificationService.savePreferences(preferences);
      Alert.alert('✓ Guardado', 'Tus preferencias han sido actualizadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
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
          <Text style={styles.subtitle}>Sistema de notificaciones inteligentes</Text>
        </View>

        {/* Alert Settings - Compact */}
        <View style={styles.alertsGrid}>
          <View style={styles.compactAlertCard}>
            <View style={styles.compactAlertHeader}>
              <Ionicons name="snow" size={20} color="#63b3ed" />
              <Text style={styles.compactAlertTitle}>Nieve</Text>
              <Text style={styles.compactAlertThreshold}>≥{preferences.minSnowfallCm}cm</Text>
            </View>
            <Switch
              value={preferences.snowAlerts}
              onValueChange={(value) => updatePreference('snowAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#63b3ed' }}
              thumbColor={preferences.snowAlerts ? '#fff' : '#64748b'}
              style={styles.compactSwitch}
            />
          </View>

          <View style={styles.compactAlertCard}>
            <View style={styles.compactAlertHeader}>
              <Ionicons name="thunderstorm" size={20} color="#8b5cf6" />
              <Text style={styles.compactAlertTitle}>Tormenta</Text>
              <Text style={styles.compactAlertThreshold}>Cruce</Text>
            </View>
            <Switch
              value={preferences.stormAlerts}
              onValueChange={(value) => updatePreference('stormAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#8b5cf6' }}
              thumbColor={preferences.stormAlerts ? '#fff' : '#64748b'}
              style={styles.compactSwitch}
            />
          </View>

          <View style={styles.compactAlertCard}>
            <View style={styles.compactAlertHeader}>
              <Ionicons name="flag" size={20} color="#f59e0b" />
              <Text style={styles.compactAlertTitle}>Viento</Text>
              <Text style={styles.compactAlertThreshold}>≥{preferences.minWindSpeedKmh}km/h</Text>
            </View>
            <Switch
              value={preferences.windAlerts}
              onValueChange={(value) => updatePreference('windAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#f59e0b' }}
              thumbColor={preferences.windAlerts ? '#fff' : '#64748b'}
              style={styles.compactSwitch}
            />
          </View>
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity 
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Ionicons name="options-outline" size={18} color="#64748b" />
          <Text style={styles.advancedToggleText}>Umbrales Personalizados</Text>
          <Ionicons 
            name={showAdvanced ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#64748b" 
          />
        </TouchableOpacity>

        {/* Advanced Settings */}
        {showAdvanced && (
          <View style={styles.advancedSection}>
            
            {/* Min Snowfall Slider */}
            {preferences.snowAlerts && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Mínimo de Nieve</Text>
                  <Text style={styles.sliderValue}>{preferences.minSnowfallCm} cm</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={30}
                  step={5}
                  value={preferences.minSnowfallCm}
                  onValueChange={(value: number) => updatePreference('minSnowfallCm', value)}
                  minimumTrackTintColor="#63b3ed"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#63b3ed"
                />
              </View>
            )}

            {/* Min Wind Speed Slider */}
            {preferences.windAlerts && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Velocidad Mínima de Viento</Text>
                  <Text style={styles.sliderValue}>{preferences.minWindSpeedKmh} km/h</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={100}
                  step={10}
                  value={preferences.minWindSpeedKmh}
                  onValueChange={(value: number) => updatePreference('minWindSpeedKmh', value)}
                  minimumTrackTintColor="#f59e0b"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#f59e0b"
                />
              </View>
            )}

            {/* Advance Notice Days */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Días de Anticipación</Text>
                <Text style={styles.sliderValue}>{preferences.advanceNoticeDays} días</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={7}
                step={1}
                value={preferences.advanceNoticeDays}
                onValueChange={(value: number) => updatePreference('advanceNoticeDays', value)}
                minimumTrackTintColor="#8b5cf6"
                maximumTrackTintColor="#334155"
                thumbTintColor="#8b5cf6"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </TouchableOpacity>
          </View>
        )}

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
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  alertsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  compactAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  compactAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactAlertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  compactAlertThreshold: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 'auto',
    marginRight: 12,
  },
  compactSwitch: {
    transform: [{ scale: 0.9 }],
  },
  advancedSection: {
    marginTop: 8,
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
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#63b3ed',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
