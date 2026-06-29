import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, TextInput, Modal, FlatList } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EngagementDashboard } from '../../components/EngagementDashboard';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const AVATARS = [
  { id: 'rider',        icon: 'snowboard',        label: 'El Rider',       color: '#a78bfa', desc: 'Snowboard o nada' },
  { id: 'clasico',      icon: 'ski',              label: 'El Clasico',     color: '#63b3ed', desc: 'Esqui de toda la vida' },
  { id: 'polvo',        icon: 'snowflake',        label: 'El Polvo',       color: '#38bdf8', desc: 'Cazador de nevadas' },
  { id: 'cumbrista',    icon: 'mountain',         label: 'El Cumbrista',   color: '#64748b', desc: 'La cumbre o no sirve' },
  { id: 'relampago',    icon: 'lightning-bolt',   label: 'El Relampago',   color: '#f59e0b', desc: 'El mas rapido' },
  { id: 'lobo',         icon: 'paw',              label: 'El Lobo',        color: '#475569', desc: 'Solo y a fondo' },
  { id: 'patron',       icon: 'crown',            label: 'El Patron',      color: '#d97706', desc: 'Rey de la montana' },
  { id: 'condor',       icon: 'feather',          label: 'El Condor',      color: '#92400e', desc: 'Libre y sin limites' },
  { id: 'explorador',   icon: 'compass',          label: 'El Explorador',  color: '#0891b2', desc: 'Siempre fuera de pista' },
  { id: 'tecnico',      icon: 'target',           label: 'El Tecnico',     color: '#10b981', desc: 'Forma perfecta' },
  { id: 'fogonero',     icon: 'fire',             label: 'El Fogonero',    color: '#ef4444', desc: 'Rey del après-ski' },
  { id: 'ola',          icon: 'waves',            label: 'La Ola',         color: '#0ea5e9', desc: 'Surfea el polvo' },
  { id: 'alpinista',    icon: 'hiking',           label: 'El Alpinista',   color: '#65a30d', desc: 'Ski touring y mas' },
  { id: 'leon',         icon: 'shield',           label: 'El Leon',        color: '#b45309', desc: 'Sin miedo a nada' },
  { id: 'instructor',   icon: 'school',           label: 'El Instructor',  color: '#06b6d4', desc: 'Sabe y enseña' },
  { id: 'nocturno',     icon: 'weather-night',    label: 'El Nocturno',    color: '#c4b5fd', desc: 'Prefiere el frio' },
  { id: 'pinero',       icon: 'pine-tree',        label: 'El Pinero',      color: '#16a34a', desc: 'Especialista en arboles' },
  { id: 'fotografo',    icon: 'camera',           label: 'El Fotografo',   color: '#ec4899', desc: 'Para el clip' },
  { id: 'familiar',     icon: 'account-group',    label: 'El Familiar',    color: '#8b5cf6', desc: 'En familia siempre' },
  { id: 'competidor',   icon: 'trophy',           label: 'El Competidor',  color: '#f97316', desc: 'A ganar o a ganar' },
];

const NAME_KEY = 'user_display_name';
const AVATAR_KEY = 'user_avatar_id';

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [avatarId, setAvatarId] = useState('cumbre');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [savedName, savedAvatar] = await Promise.all([
          AsyncStorage.getItem(NAME_KEY),
          AsyncStorage.getItem(AVATAR_KEY),
        ]);
        setUserName(savedName || user?.displayName || 'Usuario');
        setAvatarId(savedAvatar || 'cumbre');
      } catch {
        setUserName(user?.displayName || 'Usuario');
      }
    };
    load();
  }, []);

  const handleSaveName = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) { Alert.alert('Error', 'El nombre no puede estar vacío'); return; }
    setUserName(trimmed);
    setIsEditingName(false);
    try { await AsyncStorage.setItem(NAME_KEY, trimmed); } catch {}
  };

  const handleSelectAvatar = async (id: string) => {
    setAvatarId(id);
    setShowAvatarPicker(false);
    try { await AsyncStorage.setItem(AVATAR_KEY, id); } catch {}
  };

  const currentAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  const handleAbout = () => setShowAbout(true);
  const handleContact = () => Linking.openURL('mailto:info@andespowder.com');

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => {
        try { await signOut(); router.replace('/auth/login'); }
        catch { Alert.alert('Error', 'No se pudo cerrar sesión'); }
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('⚠️ Eliminar Cuenta',
      'Esta acción es PERMANENTE y no se puede deshacer.\n\nSe eliminarán:\n• Todos tus datos personales\n• Historial de pronósticos\n• Preferencias guardadas\n\n¿Estás completamente seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar Cuenta', style: 'destructive', onPress: () => {
          Alert.alert('Última Confirmación', '¿Realmente querés eliminar tu cuenta de forma permanente?', [
            { text: 'No, volver', style: 'cancel' },
            { text: 'Sí, eliminar', style: 'destructive', onPress: () => { console.log('Account deletion confirmed'); } },
          ]);
        }},
      ]
    );
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)} style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: currentAvatar.color + '33', borderColor: currentAvatar.color + '66' }]}>
              <MaterialCommunityIcons name={currentAvatar.icon as any} size={36} color={currentAvatar.color} />
            </View>
            <View style={styles.editAvatarBadge}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.avatarLabel}>{currentAvatar.label}</Text>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Tu nombre"
                placeholderTextColor="#64748b"
                autoFocus
              />
              <View style={styles.nameEditButtons}>
                <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setTempName(userName); setIsEditingName(false); }} style={styles.cancelButton}>
                  <Ionicons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setTempName(userName); setIsEditingName(true); }}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{userName}</Text>
                <Ionicons name="pencil" size={15} color="#64748b" style={styles.editIcon} />
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.email}>{user?.email || 'usuario@andespowder.com'}</Text>
        </View>

        {/* User Activity */}
        <EngagementDashboard />

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuIcon}><Ionicons name="information-circle-outline" size={20} color="#64748b" /></View>
            <Text style={styles.menuText}>Acerca de Andes Powder</Text>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
            <View style={styles.menuIcon}><Ionicons name="mail-outline" size={20} color="#64748b" /></View>
            <Text style={styles.menuText}>Contacto</Text>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color="#64748b" /></View>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <View style={styles.deleteIcon}><Ionicons name="trash-outline" size={20} color="#ef4444" /></View>
            <Text style={[styles.deleteText, { color: '#ef4444' }]}>Eliminar cuenta</Text>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Andes Powder v{Constants.expoConfig?.version || '1.0.0'}</Text>
          <Text style={styles.footerText}>Season 0 — Acceso completo gratis</Text>
          <Text style={styles.footerAttribution}>Weather data by Open-Meteo.com</Text>
        </View>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAvatarPicker(false)} />
          <View style={styles.avatarPickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Elegí tu avatar</Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={AVATARS}
              keyExtractor={item => item.id}
              numColumns={4}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.avatarOption, avatarId === item.id && { borderColor: item.color, borderWidth: 2, backgroundColor: item.color + '22' }]}
                  onPress={() => handleSelectAvatar(item.id)}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={avatarId === item.id ? item.color : '#94a3b8'} />
                  <Text style={[styles.avatarOptionLabel, avatarId === item.id && { color: item.color }]}>{item.label}</Text>
                  <Text style={styles.avatarOptionDesc}>{item.desc}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAbout} transparent animationType="fade" onRequestClose={() => setShowAbout(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAbout(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Acerca de Andes Powder</Text>
              <TouchableOpacity onPress={() => setShowAbout(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              Andes Powder es un sistema de pronósticos inteligentes para la Patagonia andina. Analizamos datos meteorológicos en tiempo real para predecir nevadas, viento y tormentas en los principales centros de ski de Argentina y Chile.{'\n\n'}
              Nuestro motor cruza múltiples fuentes de datos — modelos globales, estaciones locales y análisis topográfico — para entregarte alertas precisas cuando las condiciones se alinean para una buena jornada de nieve.
            </Text>
            <Text style={styles.modalSources}>
              Fuentes de datos{'\n'}
              • Pronóstico meteorológico: Open-Meteo.com (CC BY 4.0){'\n'}
              • Imágenes satelitales: NOAA GOES-16{'\n'}
              • Datos observacionales: SMN Argentina
            </Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAbout(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 38,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  avatarLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  avatarPickerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  avatarOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarOptionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  avatarOptionLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  avatarOptionDesc: {
    fontSize: 8,
    color: '#475569',
    textAlign: 'center',
    marginTop: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  editIcon: {
    marginLeft: 4,
    marginBottom: 4,
  },
  nameEditContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#63b3ed',
    marginBottom: 8,
    minWidth: 200,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  menuIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    marginLeft: 40,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  menuValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValueText: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  version: {
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  logoutIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  deleteIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    flex: 1,
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    marginLeft: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  modalBody: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalClose: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  footerAttribution: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
  modalSources: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 116, 139, 0.2)',
  },
});
