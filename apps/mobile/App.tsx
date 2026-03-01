import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { VaultScreen } from './src/screens/VaultScreen';
import { TimerScreen } from './src/screens/Timer';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { InitialSetupScreen } from './src/screens/InitialSetupScreen';
import { isSignedUp, getStoredCode, signOut } from './src/lib/auth';

export default function App() {
  const [view, setView] = useState<'loading' | 'signup' | 'setup' | 'disguise' | 'vault'>('loading');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [secretCode, setSecretCode] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check current auth state
      console.log('[App] Checking initial auth state...');

      const signedUp = await isSignedUp();
      if (signedUp) {
        const code = await getStoredCode();
        setSecretCode(code);
        setView('disguise');
      } else {
        setAuthMode('signup');
        setView('signup');
      }
    };
    checkAuth();
  }, []);

  const handleSignUpComplete = async () => {
    const code = await getStoredCode();
    setSecretCode(code);
    setView('setup'); // Route to initial setup after signup
  };

  const handleSetupComplete = () => {
    setShowOverlay(true);
    setView('disguise');
  };

  const handleLoginComplete = async () => {
    const code = await getStoredCode();
    setSecretCode(code);
    setView('disguise');
  };

  const handleUnlock = () => {
    setView('vault');
  };

  const handleLogout = async () => {
    await signOut();
    setSecretCode(null);
    setAuthMode('login');
    setView('signup');
  };

  const handleQuickExit = () => {
    setShowOverlay(false);
    setView('disguise');
  };

  if (view === 'loading') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#E8956A" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {view === 'signup' && (
        <SignUpScreen
          onSignUpComplete={handleSignUpComplete}
          onLoginComplete={handleLoginComplete}
          initialMode={authMode}
        />
      )}
      {view === 'setup' && (
        <InitialSetupScreen onComplete={handleSetupComplete} />
      )}
      {view === 'disguise' && (
        <TimerScreen
          onUnlock={handleUnlock}
          secretCode={secretCode}
          showInstructionOverlay={showOverlay}
          onGoToSignUp={() => setView('signup')}
        />
      )}
      {view === 'vault' && (
        <VaultScreen onQuickExit={handleQuickExit} onLogout={handleLogout} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
