import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rideType, setRideType] = useState<'ski' | 'snowboard' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }

    if (!rideType) {
      Alert.alert('Error', '¿Hacés ski o snowboard?');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, displayName, rideType!);
      Alert.alert('¡Listo!', 'Cuenta creada exitosamente', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Andes Powder</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#a0aec0"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#a0aec0"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <View style={styles.rideTypeContainer}>
              <Text style={styles.rideTypeLabel}>¿Qué hacés?</Text>
              <View style={styles.rideTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.rideTypeButton,
                    rideType === 'ski' && styles.rideTypeButtonActive
                  ]}
                  onPress={() => setRideType('ski')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.rideTypeButtonText,
                    rideType === 'ski' && styles.rideTypeButtonTextActive
                  ]}>⛷️ Ski</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.rideTypeButton,
                    rideType === 'snowboard' && styles.rideTypeButtonActive
                  ]}
                  onPress={() => setRideType('snowboard')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.rideTypeButtonText,
                    rideType === 'snowboard' && styles.rideTypeButtonTextActive
                  ]}>🏂 Snowboard</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#a0aec0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#a0aec0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#63b3ed',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#2d3748',
  },
  button: {
    backgroundColor: '#63b3ed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#e6f7ff',
    fontSize: 14,
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#63b3ed',
  },
  rideTypeContainer: {
    marginBottom: 16,
  },
  rideTypeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  rideTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rideTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rideTypeButtonActive: {
    backgroundColor: '#63b3ed',
    borderColor: '#fff',
  },
  rideTypeButtonText: {
    color: '#e6f7ff',
    fontSize: 16,
    fontWeight: '600',
  },
  rideTypeButtonTextActive: {
    color: '#fff',
  },
});
