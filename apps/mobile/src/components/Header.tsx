import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
    onQuickExit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickExit }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
                <View style={styles.leftSection}>
                    <Image
                        source={require('../../assets/amber-logo.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.brandName}>Amber</Text>
                </View>

                <TouchableOpacity
                    style={styles.quickExitButton}
                    activeOpacity={0.8}
                    onPress={onQuickExit}
                >
                    <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.quickExitText}>QUICK EXIT</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    brandName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    quickExitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333333',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        // Shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    quickExitText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
});
