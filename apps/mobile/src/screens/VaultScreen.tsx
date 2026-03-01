import React from 'react';
import { View, StyleSheet } from 'react-native';
import MainRouter from '../MainRouter';

interface VaultScreenProps {
    onQuickExit: () => void;
}

export const VaultScreen = ({ onQuickExit }: VaultScreenProps) => {
    return (
        <View style={styles.container}>
            <MainRouter />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
