import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { VaultScreen } from './src/screens/VaultScreen';
import { DisguiseScreen } from './src/screens/DisguiseScreen';

export default function App() {
  // Navigation state: 'disguise' or 'vault'
  const [view, setView] = useState<'disguise' | 'vault'>('vault');

  const handleQuickExit = () => {
    setView('disguise');
  };

  const handleUnlock = () => {
    setView('vault');
  };

  return (
    <View style={styles.container}>
      {view === 'vault' ? (
        <VaultScreen onQuickExit={handleQuickExit} />
      ) : (
        <DisguiseScreen onUnlock={handleUnlock} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});