import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisguiseScreenProps {
    onUnlock?: () => void;
}

export const DisguiseScreen: React.FC<DisguiseScreenProps> = ({ onUnlock }) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meditation Timer</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.timerCircle}>
                    <Text style={styles.timerText}>10:00</Text>
                </View>

                <TouchableOpacity style={styles.startButton} activeOpacity={0.8}>
                    <Text style={styles.startButtonText}>Start Session</Text>
                </TouchableOpacity>

                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Ionicons name="leaf-outline" size={32} color="#4CAF50" />
                        <Text style={styles.gridText}>Zen</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Ionicons name="water-outline" size={32} color="#2196F3" />
                        <Text style={styles.gridText}>Rain</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Ionicons name="sunny-outline" size={32} color="#FFC107" />
                        <Text style={styles.gridText}>Focus</Text>
                    </View>
                </View>
            </View>

            {/* Hidden Unlock Point (Long press timer circle for 3 seconds) */}
            <TouchableOpacity
                style={styles.unlockSection}
                onLongPress={onUnlock}
                delayLongPress={3000}
                activeOpacity={1}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        padding: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '300',
        color: '#333',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    timerCircle: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        backgroundColor: '#FFF',
    },
    timerText: {
        fontSize: 48,
        fontWeight: '200',
        color: '#333',
    },
    startButton: {
        backgroundColor: '#333',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        marginBottom: 60,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    gridItem: {
        alignItems: 'center',
    },
    gridText: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
    },
    unlockSection: {
        position: 'absolute',
        top: '20%',
        width: '100%',
        height: 300,
    }
});
