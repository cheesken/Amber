import React from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';

interface DisguiseScreenProps {
    onUnlock: () => void;
}

export const DisguiseScreen = ({ onUnlock }: DisguiseScreenProps) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Calculator (Disguise)</Text>
                <Text style={styles.subtitle}>Enter passcode to enter the Vault</Text>
                <Button title="Unlock App" onPress={onUnlock} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
});
