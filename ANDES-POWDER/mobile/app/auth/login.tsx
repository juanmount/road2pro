import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_CONFIG } from '../../config/google';
import { logEvent } from '../../services/meta';
import { setDevBypass } from '../_layout';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogleCredential } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CONFIG.webClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    redirectUri: Platform.OS === 'android'
      ? `com.googleusercontent.apps.${GOOGLE_CONFIG.androidClientId.split('.apps.')[0]}:/oauth2redirect/google`
      : undefined,
  });

  useEffect(() => {
    if (request) {
      console.log('[Google OAuth] redirectUri:', request.redirectUri);
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleResponse(id_token);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Error', 'No se pudo completar el inicio con Google.');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (idToken: string) => {
    try {
      await signInWithGoogleCredential(idToken);
      logEvent('login', { method: 'google' });
      router.replace('/');
    } catch (error: any) {
      const msg = error?.code === 'auth/account-exists-with-different-credential'
        ? 'Ya existe una cuenta con este email. Iniciá sesión con email y contraseña.'
        : 'No se pudo iniciar sesión con Google. Intentá de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (GOOGLE_CONFIG.webClientId.startsWith('REPLACE')) {
      Alert.alert('Configuración pendiente', 'Google login aún no está configurado.');
      return;
    }
    setGoogleLoading(true);
    await promptAsync();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
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
          <View style={styles.header}>
            <Image 
              source={require('../../assets/Logo_horizontal.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Lectura local para la nieve de Andes argentinos</Text>
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
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color="#94a3b8" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/auth/forgot-password')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#1e293b" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/auth/signup')}
              disabled={loading || googleLoading}
            >
              <Text style={styles.linkText}>
                ¿No tenés cuenta? <Text style={styles.linkTextBold}>Registrate</Text>
              </Text>
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.devBypass}
                onPress={() => { setDevBypass(true); router.replace('/'); }}
              >
                <Text style={styles.devBypassText}>⚙️ DEV: Entrar sin login</Text>
              </TouchableOpacity>
            )}
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
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logo: {
    width: 240,
    height: 90,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
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
    marginTop: 24,
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
  eyeIcon: {
    position: 'absolute',
    right: 18,
    top: 18,
    zIndex: 1,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#63b3ed',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  devBypass: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  devBypassText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
