import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavBar, TabId } from '../components/NavBar';
import { Header } from '../components/Header';
import { CheckInScreen } from './CheckInScreen';

const ScreenPlaceholder: React.FC<{ title: string; color: string }> = ({ title, color }) => (
    <View style={[styles.placeholder, { backgroundColor: color }]}>
        <Text style={styles.placeholderText}>{title}</Text>
    </View>
);

interface VaultScreenProps {
    onQuickExit?: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({ onQuickExit }) => {
    const [activeTab, setActiveTab] = useState<TabId>('checkin');

    const renderContent = () => {
        switch (activeTab) {
            case 'journal':
                return <ScreenPlaceholder title="Journal Section" color="#f8f9fa" />;
            case 'checkin':
                return <CheckInScreen />;
            case 'agent':
                return <ScreenPlaceholder title="Agent Section" color="#f8f9fa" />;
            case 'profile':
                return <ScreenPlaceholder title="Profile Section" color="#f8f9fa" />;
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <Header onQuickExit={onQuickExit} />
            <View style={styles.content}>
                {renderContent()}
            </View>
            <NavBar activeTab={activeTab} onTabPress={setActiveTab} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
    },
});
