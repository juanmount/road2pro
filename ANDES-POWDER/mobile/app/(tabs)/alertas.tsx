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
                Aviso cuando se pronostiquen más de {preferences.minSnowfallCm}cm
              </Text>
            </View>
            <Switch
              value={preferences.snowAlerts}
              onValueChange={(value) => updatePreference('snowAlerts', value)}
              trackColor={{ false: '#334155', true: '#63b3ed' }}
              thumbColor={preferences.snowAlerts ? '#fff' : '#94a3b8'}
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
              value={preferences.stormAlerts}
              onValueChange={(value) => updatePreference('stormAlerts', value)}
              trackColor={{ false: '#334155', true: '#8b5cf6' }}
              thumbColor={preferences.stormAlerts ? '#fff' : '#94a3b8'}
            />
          </View>

          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="flag" size={24} color="#f59e0b" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Viento Extremo</Text>
              <Text style={styles.alertDescription}>
                Aviso cuando el viento supere {preferences.minWindSpeedKmh} km/h
              </Text>
            </View>
            <Switch
              value={preferences.windAlerts}
              onValueChange={(value) => updatePreference('windAlerts', value)}
              trackColor={{ false: '#334155', true: '#f59e0b' }}
              thumbColor={preferences.windAlerts ? '#fff' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity 
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Ionicons name="settings-outline" size={20} color="#63b3ed" />
          <Text style={styles.advancedToggleText}>Configuración Avanzada</Text>
          <Ionicons 
            name={showAdvanced ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#63b3ed" 
          />
        </TouchableOpacity>

        {/* Advanced Settings */}
        {showAdvanced && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Umbrales Personalizados</Text>
            
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
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 179, 237, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.3)',
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#63b3ed',
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
