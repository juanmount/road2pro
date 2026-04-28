import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import notificationService, { 
  NotificationPreferences, 
  DEFAULT_NOTIFICATION_PREFERENCES 
} from '../../services/notifications';

export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const token = await notificationService.registerForPushNotifications();
    setPermissionGranted(!!token);
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'No se pudieron cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await notificationService.savePreferences(preferences);
      Alert.alert('✓ Guardado', 'Tus preferencias han sido actualizadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="notifications-off-outline" size={64} color="#94a3b8" />
        <Text style={styles.permissionTitle}>Notificaciones Desactivadas</Text>
        <Text style={styles.permissionText}>
          Activa los permisos de notificaciones en la configuración de tu dispositivo para recibir alertas.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={checkPermissions}>
          <Text style={styles.retryButtonText}>Verificar Permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={32} color="#0ea5e9" />
        <Text style={styles.title}>Configuración de Notificaciones</Text>
        <Text style={styles.subtitle}>Personaliza tus alertas de nieve y viento</Text>
      </View>

      {/* Basic Toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos de Alertas</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="snow-outline" size={24} color="#0ea5e9" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Alertas de Nieve</Text>
              <Text style={styles.settingDescription}>Nevadas importantes en tus cerros</Text>
            </View>
          </View>
          <Switch
            value={preferences.snowAlerts}
            onValueChange={(value) => updatePreference('snowAlerts', value)}
            trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
            thumbColor={preferences.snowAlerts ? '#0ea5e9' : '#f1f5f9'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="thunderstorm-outline" size={24} color="#0ea5e9" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Alertas de Tormenta</Text>
              <Text style={styles.settingDescription}>Tormentas y condiciones adversas</Text>
            </View>
          </View>
          <Switch
            value={preferences.stormAlerts}
            onValueChange={(value) => updatePreference('stormAlerts', value)}
            trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
            thumbColor={preferences.stormAlerts ? '#0ea5e9' : '#f1f5f9'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="flag-outline" size={24} color="#0ea5e9" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Alertas de Viento</Text>
              <Text style={styles.settingDescription}>Vientos fuertes que afectan medios</Text>
            </View>
          </View>
          <Switch
            value={preferences.windAlerts}
            onValueChange={(value) => updatePreference('windAlerts', value)}
            trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
            thumbColor={preferences.windAlerts ? '#0ea5e9' : '#f1f5f9'}
          />
        </View>
      </View>

      {/* Snow Alert Settings */}
      {preferences.snowAlerts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración de Nieve</Text>
          
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
              minimumTrackTintColor="#0ea5e9"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#0ea5e9"
            />
            <Text style={styles.sliderHint}>Solo alertar si se pronostican al menos {preferences.minSnowfallCm}cm</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#0ea5e9" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Solo Alta Confianza</Text>
                <Text style={styles.settingDescription}>Alertar solo con score de confianza alto</Text>
              </View>
            </View>
            <Switch
              value={preferences.requireHighConfidence}
              onValueChange={(value) => updatePreference('requireHighConfidence', value)}
              trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
              thumbColor={preferences.requireHighConfidence ? '#0ea5e9' : '#f1f5f9'}
            />
          </View>
        </View>
      )}

      {/* Wind Alert Settings */}
      {preferences.windAlerts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración de Viento</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Velocidad Mínima</Text>
              <Text style={styles.sliderValue}>{preferences.minWindSpeedKmh} km/h</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={100}
              step={10}
              value={preferences.minWindSpeedKmh}
              onValueChange={(value: number) => updatePreference('minWindSpeedKmh', value)}
              minimumTrackTintColor="#0ea5e9"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#0ea5e9"
            />
            <Text style={styles.sliderHint}>Alertar si el viento supera {preferences.minWindSpeedKmh} km/h</Text>
          </View>
        </View>
      )}

      {/* Timing Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anticipación y Horarios</Text>
        
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
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="#cbd5e1"
            thumbTintColor="#0ea5e9"
          />
          <Text style={styles.sliderHint}>Recibir alertas hasta {preferences.advanceNoticeDays} días antes</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color="#0ea5e9" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Modo Silencioso</Text>
              <Text style={styles.settingDescription}>
                {preferences.quietHoursEnabled 
                  ? `Activo de ${preferences.quietHoursStart} a ${preferences.quietHoursEnd}`
                  : 'Desactivado'}
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.quietHoursEnabled}
            onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
            trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
            thumbColor={preferences.quietHoursEnabled ? '#0ea5e9' : '#f1f5f9'}
          />
        </View>
      </View>

      {/* Resort Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cerros</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location-outline" size={24} color="#0ea5e9" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Todos los Cerros</Text>
              <Text style={styles.settingDescription}>
                {preferences.allResorts 
                  ? 'Recibir alertas de todos los cerros'
                  : `Solo ${preferences.favoriteResorts.length} favoritos`}
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.allResorts}
            onValueChange={(value) => updatePreference('allResorts', value)}
            trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
            thumbColor={preferences.allResorts ? '#0ea5e9' : '#f1f5f9'}
          />
        </View>

        {!preferences.allResorts && (
          <TouchableOpacity style={styles.manageButton}>
            <Text style={styles.manageButtonText}>Gestionar Cerros Favoritos</Text>
            <Ionicons name="chevron-forward" size={20} color="#0ea5e9" />
          </TouchableOpacity>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={savePreferences}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text style={styles.saveButtonText}>Guardar Configuración</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Las notificaciones se enviarán según tus preferencias y las condiciones meteorológicas.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  manageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
