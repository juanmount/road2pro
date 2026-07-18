import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import notificationService, { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notifications';
import { resortsService } from '../../services/resorts';
import { Resort } from '../../types';

export default function AlertasScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loadingResorts, setLoadingResorts] = useState(false);

  useEffect(() => {
    loadPreferences();
    setupNotifications();
    loadResorts();
  }, []);

  const loadResorts = async () => {
    setLoadingResorts(true);
    try {
      const data = await resortsService.getAll();
      setResorts(data);
    } catch (error) {
      console.error('Error loading resorts:', error);
    } finally {
      setLoadingResorts(false);
    }
  };

  const toggleResort = (resortId: string) => {
    if (preferences.allResorts) {
      // Switching from "all" mode: keep all selected except the tapped one
      const allIds = resorts.map(r => r.id).filter(id => id !== resortId);
      setPreferences(prev => ({ ...prev, allResorts: false, favoriteResorts: allIds }));
    } else {
      const current = preferences.favoriteResorts || [];
      const updated = current.includes(resortId)
        ? current.filter(id => id !== resortId)
        : [...current, resortId];
      setPreferences(prev => ({ ...prev, favoriteResorts: updated }));
    }
  };

  const toggleAllResorts = () => {
    if (preferences.allResorts) {
      setPreferences(prev => ({ ...prev, allResorts: false, favoriteResorts: [] }));
    } else {
      setPreferences(prev => ({ ...prev, allResorts: true, favoriteResorts: [] }));
    }
  };

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
      // Save token to backend
      await notificationService.savePushToken(token);
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

  const requestPermissions = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setPermissionGranted(true);
      Alert.alert('✓ Permisos otorgados', 'Las notificaciones están activadas');
    } else {
      Alert.alert('Error', 'No se pudieron obtener los permisos. Verifica la configuración de tu dispositivo.');
    }
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

        {/* Alert Settings */}
        <View style={styles.alertsGroup}>
          <View style={styles.alertRow}>
            <Ionicons name="snow" size={18} color="#64748b" />
            <Text style={styles.alertLabel}>Nieve</Text>
            <Text style={styles.alertThreshold}>≥{preferences.minSnowfallCm}cm</Text>
            <Switch
              value={preferences.snowAlerts}
              onValueChange={(value) => updatePreference('snowAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#475569' }}
              thumbColor={preferences.snowAlerts ? '#e2e8f0' : '#64748b'}
              style={styles.alertSwitch}
            />
          </View>

          <View style={styles.alertDivider} />

          <View style={styles.alertRow}>
            <Ionicons name="thunderstorm" size={18} color="#64748b" />
            <Text style={styles.alertLabel}>Tormenta</Text>
            <Text style={styles.alertThreshold}>cruce</Text>
            <Switch
              value={preferences.stormAlerts}
              onValueChange={(value) => updatePreference('stormAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#475569' }}
              thumbColor={preferences.stormAlerts ? '#e2e8f0' : '#64748b'}
              style={styles.alertSwitch}
            />
          </View>

          <View style={styles.alertDivider} />

          <View style={styles.alertRow}>
            <Ionicons name="flag" size={18} color="#64748b" />
            <Text style={styles.alertLabel}>Viento</Text>
            <Text style={styles.alertThreshold}>≥{preferences.minWindSpeedKmh}km/h</Text>
            <Switch
              value={preferences.windAlerts}
              onValueChange={(value) => updatePreference('windAlerts', value)}
              trackColor={{ false: '#1e293b', true: '#475569' }}
              thumbColor={preferences.windAlerts ? '#e2e8f0' : '#64748b'}
              style={styles.alertSwitch}
            />
          </View>
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Ionicons name="options-outline" size={16} color="#64748b" />
          <Text style={styles.advancedToggleText}>Umbrales Personalizados</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#64748b"
          />
        </TouchableOpacity>

        {/* Advanced Settings */}
        {showAdvanced && (
          <View style={styles.advancedSection}>
            {preferences.snowAlerts && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Nieve mínima</Text>
                  <Text style={styles.sliderValue}>{preferences.minSnowfallCm} cm</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={30}
                  step={5}
                  value={preferences.minSnowfallCm}
                  onValueChange={(value: number) => updatePreference('minSnowfallCm', value)}
                  minimumTrackTintColor="#475569"
                  maximumTrackTintColor="#1e293b"
                  thumbTintColor="#94a3b8"
                />
              </View>
            )}

            {preferences.windAlerts && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Viento mínimo</Text>
                  <Text style={styles.sliderValue}>{preferences.minWindSpeedKmh} km/h</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={100}
                  step={10}
                  value={preferences.minWindSpeedKmh}
                  onValueChange={(value: number) => updatePreference('minWindSpeedKmh', value)}
                  minimumTrackTintColor="#475569"
                  maximumTrackTintColor="#1e293b"
                  thumbTintColor="#94a3b8"
                />
              </View>
            )}

            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Anticipación</Text>
                <Text style={styles.sliderValue}>{preferences.advanceNoticeDays} días</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={7}
                step={1}
                value={preferences.advanceNoticeDays}
                onValueChange={(value: number) => updatePreference('advanceNoticeDays', value)}
                minimumTrackTintColor="#475569"
                maximumTrackTintColor="#1e293b"
                thumbTintColor="#94a3b8"
              />
            </View>
          </View>
        )}

        {/* Resort Filter */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color="#64748b" />
            <Text style={styles.sectionTitle}>Cerros</Text>
          </View>

          {loadingResorts ? (
            <ActivityIndicator color="#64748b" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.resortList}>
              <TouchableOpacity
                style={[styles.resortRow, preferences.allResorts && styles.resortRowSelected]}
                onPress={toggleAllResorts}
              >
                <Text style={[styles.resortName, preferences.allResorts && styles.resortNameSelected]}>
                  Todos los cerros
                </Text>
                <Ionicons
                  name={preferences.allResorts ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={preferences.allResorts ? '#e2e8f0' : '#475569'}
                />
              </TouchableOpacity>

              {resorts.map(resort => {
                const selected = preferences.allResorts ||
                  (preferences.favoriteResorts || []).includes(resort.id);
                return (
                  <TouchableOpacity
                    key={resort.id}
                    style={[styles.resortRow, selected && styles.resortRowSelected]}
                    onPress={() => toggleResort(resort.id)}
                  >
                    <Text style={[styles.resortName, selected && styles.resortNameSelected]}>
                      {resort.name}
                    </Text>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? '#e2e8f0' : '#475569'}
                    />
                  </TouchableOpacity>
                );
              })}

              {resorts.length === 0 && (
                <Text style={styles.resortEmpty}>No se pudieron cargar los cerros</Text>
              )}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>

        {!permissionGranted && (
          <View style={styles.permissionWarning}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.permissionText}>
              Permisos de notificaciones no otorgados.
            </Text>
          </View>
        )}

        {!permissionGranted && (
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            <Text style={styles.permissionButtonText}>Activar Notificaciones</Text>
          </TouchableOpacity>
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
  alertsGroup: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  alertLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#cbd5e1',
    flex: 1,
  },
  alertThreshold: {
    fontSize: 13,
    color: '#475569',
    marginRight: 4,
  },
  alertSwitch: {
    transform: [{ scale: 0.85 }],
  },
  alertDivider: {
    height: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    marginHorizontal: 14,
  },
  advancedSection: {
    marginTop: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    gap: 8,
  },
  advancedToggleText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  sliderContainer: {
    marginBottom: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.15)',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  sliderLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  slider: {
    width: '100%',
    height: 32,
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
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resortToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resortToggleLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  resortList: {
    gap: 4,
  },
  resortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  resortRowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resortName: {
    fontSize: 14,
    color: '#475569',
  },
  resortNameSelected: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  resortEmpty: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
