import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresá tu email');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Por favor ingresá un email válido');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
      Alert.alert(
        '¡Email enviado!',
        'Te enviamos un link para restablecer tu contraseña. Revisá tu casilla de correo.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'No se pudo enviar el email. Intentá de nuevo.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con ese email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El email ingresado no es válido.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image 
              source={require('../../assets/Logo_horizontal.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.subtitle}>
              Ingresá tu email y te enviaremos un link para restablecer tu contraseña
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !emailSent}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || emailSent) && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading || emailSent}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Enviando...' : emailSent ? 'Email enviado ✓' : 'Enviar link de recuperación'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Volver al <Text style={styles.linkTextBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logo: {
    width: 240,
    height: 90,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  button: {
    backgroundColor: '#63b3ed',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#63b3ed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  linkText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  linkTextBold: {
    fontWeight: '700',
    color: '#63b3ed',
  },
});
