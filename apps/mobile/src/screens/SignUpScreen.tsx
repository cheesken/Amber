import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WheelColumn, HOURS, MINS, SECS } from '../components/WheelColumn';
import { signUp, logIn } from '../lib/auth';

interface SignUpScreenProps {
  onSignUpComplete: () => void;
  onLoginComplete: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignUpComplete, onLoginComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const handleSignUp = async () => {
    if (!username.trim()) {
      Alert.alert('Missing username', 'Please enter a username.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords don\'t match', 'Please make sure your passwords match.');
      return;
    }
    const code = hours * 10000 + minutes * 100 + seconds;
    if (code === 0) {
      Alert.alert('Invalid code', 'Please set a secret code that is not 00:00:00.');
      return;
    }

    setLoading(true);
    const result = await signUp(username.trim(), password, code);
    setLoading(false);

    if (result.success) {
      onSignUpComplete();
    } else {
      Alert.alert('Sign up failed', result.error || 'Something went wrong.');
    }
  };

  const handleLogIn = async () => {
    if (!username.trim()) {
      Alert.alert('Missing username', 'Please enter a username.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await logIn(username.trim(), password);
    setLoading(false);

    if (result.success) {
      onLoginComplete();
    } else {
      Alert.alert('Login failed', result.error || 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{isLoginMode ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.headerSubtitle}>
              {isLoginMode ? 'Log in to your meditation timer' : 'Set up your meditation timer'}
            </Text>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor="#C4A882"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#C4A882"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#C4A882"
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isLoginMode && (
            <>
              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor="#C4A882"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="none"
                    autoComplete="off"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#C4A882"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Ionicons name="warning-outline" size={18} color="#E8956A" />
                <Text style={styles.disclaimerText}>
                  There is no way to recover your password or secret code. Please remember them.
                </Text>
              </View>

              {/* Secret Code Picker */}
              <View style={styles.codeSection}>
                <Text style={styles.codeSectionTitle}>Set Your Secret Code</Text>
                <Text style={styles.codeSectionHint}>
                  Use this code on the timer to access your vault
                </Text>

                <View style={styles.pickerRow}>
                  <WheelColumn data={HOURS} initialIndex={0} onIndexChange={setHours} visibleItems={3} />
                  <Text style={styles.pickerSep}>:</Text>
                  <WheelColumn data={MINS} initialIndex={0} onIndexChange={setMinutes} visibleItems={3} />
                  <Text style={styles.pickerSep}>:</Text>
                  <WheelColumn data={SECS} initialIndex={0} onIndexChange={setSeconds} visibleItems={3} />
                </View>

                <View style={styles.pickerLabels}>
                  <Text style={styles.pickerLabel}>hours</Text>
                  <Text style={styles.pickerLabel}>min</Text>
                  <Text style={styles.pickerLabel}>sec</Text>
                </View>
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={isLoginMode ? handleLogIn : handleSignUp}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFAF5" />
            ) : (
              <Text style={styles.createBtnText}>
                {isLoginMode ? 'Log In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle login/signup */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsLoginMode(!isLoginMode)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {isLoginMode ? "Don't have an account? " : 'Have an account already? '}
              <Text style={styles.toggleLink}>
                {isLoginMode ? 'Sign Up' : 'Log In'}
              </Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: '#4A3728',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#C4A882',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A3728',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDE8',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4A3728',
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 6,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0E8',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#5C3D2E',
    lineHeight: 19,
  },

  codeSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  codeSectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4A3728',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeSectionHint: {
    fontSize: 13,
    fontWeight: '400',
    color: '#C4A882',
    marginBottom: 12,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  pickerSep: {
    fontSize: 30,
    fontWeight: '300',
    color: '#C4A882',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  pickerLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    paddingTop: 4,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#C4A882',
    letterSpacing: 0.5,
  },

  createBtn: {
    alignSelf: 'center',
    backgroundColor: '#E8956A',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 12,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFAF5',
    letterSpacing: 1,
  },

  toggleBtn: {
    alignSelf: 'center',
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#5C3D2E',
  },
  toggleLink: {
    fontWeight: '600',
    color: '#E8956A',
  },
});
