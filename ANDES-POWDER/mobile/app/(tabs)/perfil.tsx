import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EngagementDashboard } from '../../components/EngagementDashboard';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [userName, setUserName] = useState(user?.displayName || 'Usuario');
  const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu galería para cambiar la foto de perfil'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu cámara para tomar una foto'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Cambiar foto de perfil',
      'Elegí una opción',
      [
        {
          text: 'Tomar foto',
          onPress: handleTakePhoto,
        },
        {
          text: 'Elegir de galería',
          onPress: handlePickImage,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
    } else {
      Alert.alert('Error', 'El nombre no puede estar vacío');
    }
  };

  const handleCancelEdit = () => {
    setTempName(userName);
    setIsEditingName(false);
  };

  const handleAbout = () => {
    // Show about modal or navigate to about screen
    console.log('About pressed');
  };

  const handleContact = () => {
    Linking.openURL('mailto:info@andespowder.com');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que querés cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Eliminar Cuenta',
      'Esta acción es PERMANENTE y no se puede deshacer.\n\n' +
      'Se eliminarán:\n' +
      '• Todos tus datos personales\n' +
      '• Historial de pronósticos\n' +
      '• Preferencias guardadas\n\n' +
      '¿Estás completamente seguro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar Cuenta',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for extra safety
            Alert.alert(
              'Última Confirmación',
              '¿Realmente querés eliminar tu cuenta de forma permanente?',
              [
                {
                  text: 'No, volver',
                  style: 'cancel',
                },
                {
                  text: 'Sí, eliminar',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    console.log('Account deletion confirmed');
                    // Delete user data, close session, navigate to welcome
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#63b3ed" />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Nombre"
                placeholderTextColor="#64748b"
                autoFocus
              />
              <View style={styles.nameEditButtons}>
                <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                  <Ionicons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setTempName(userName); setIsEditingName(true); }}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{userName}</Text>
                <Ionicons name="pencil" size={16} color="#64748b" style={styles.editIcon} />
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
            <View style={styles.menuIcon}>
              <Ionicons name="information-circle" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Acerca de Andes Powder</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
            <View style={styles.menuIcon}>
              <Ionicons name="mail" size={20} color="#63b3ed" />
            </View>
            <Text style={styles.menuText}>Contacto</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <View style={styles.deleteIcon}>
              <Ionicons name="trash" size={20} color="#ef4444" />
            </View>
            <Text style={styles.deleteText}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Andes Powder v1.0.0</Text>
          <Text style={styles.footerText}>Season 0 - Acceso Completo Gratis</Text>
          <Text style={styles.footerText}>Pronósticos científicos para Patagonia</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 179, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#63b3ed',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#63b3ed',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#63b3ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
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
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deleteText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
});
