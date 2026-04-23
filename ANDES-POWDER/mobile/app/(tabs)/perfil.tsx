import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PerfilScreen() {
  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#63b3ed" />
          </View>
          <Text style={styles.name}>Usuario</Text>
          <Text style={styles.email}>usuario@andespowder.com</Text>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="location" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Cerros Favoritos</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="thermometer" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Unidades</Text>
            <View style={styles.menuValue}>
              <Text style={styles.menuValueText}>°C, cm, km/h</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="language" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Idioma</Text>
            <View style={styles.menuValue}>
              <Text style={styles.menuValueText}>Español</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="star" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.menuText}>Actualizar a Premium</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="card" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Suscripción</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="lock-closed" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="help-circle" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Ayuda</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="information-circle" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Acerca de</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="log-out" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Cerrar Sesión</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Versión 1.0.0</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 179, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#63b3ed',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 179, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
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
  version: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 20,
  },
});
