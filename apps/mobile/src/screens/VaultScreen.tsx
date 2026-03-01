import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import JournalScreen from './JournalScreen';
import { NavBar, TabId } from '../components/NavBar';
import { ProfileScreen } from './ProfileScreen';
import { CheckInScreen } from './CheckInScreen';
import { AgentScreen } from './AgentScreen';
import { Header } from '../components/Header';

interface VaultScreenProps {
    onQuickExit: () => void;
}

// Dummy evidence
const EVIDENCE_ITEMS = [
    { id: '1', title: 'Suspicious Car License', type: 'Text', date: 'Oct 24, 2026' },
    { id: '2', title: 'Audio Argument', type: 'Audio', date: 'Oct 23, 2026' },
    { id: '3', title: 'Photo of broken window', type: 'Photo', date: 'Oct 21, 2026' },
];

export const VaultScreen = ({ onQuickExit }: VaultScreenProps) => {
    const [currentView, setCurrentView] = useState<'evidence' | 'journal'>('journal');
    const [activeTab, setActiveTab] = useState<TabId>('journal');

    const handleTabPress = (id: TabId) => {
        setActiveTab(id);
        if (id === 'journal') {
            setCurrentView('journal');
        }
    };

    const handleViewEvidence = () => {
        setCurrentView('evidence');
        setActiveTab('journal'); // keep journal active or let it visually deselect if desired
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.evidenceItem}>
            <Ionicons
                name={
                    item.type === 'Photo' ? 'image-outline' :
                        item.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                }
                size={24}
                color="#666"
                style={{ marginRight: 15 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDate}>{item.date}</Text>
            </View>
        </View>
    );

    const renderTabContent = () => {
        if (activeTab === 'profile') {
            return (
                <View style={styles.tabContentWrapper}>
                    <ProfileScreen />
                </View>
            );
        }
        if (activeTab === 'checkin') {
            return (
                <View style={styles.tabContentWrapper}>
                    <CheckInScreen />
                </View>
            );
        }
        if (activeTab === 'agent') {
            return (
                <View style={styles.tabContentWrapper}>
                    <AgentScreen />
                </View>
            );
        }

        // Active tab is 'journal'
        if (currentView === 'journal') {
            return <JournalScreen onViewEvidence={handleViewEvidence} />;
        }

        // currentView === 'evidence'
        return (
            <View style={styles.tabContentWrapper}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>My Vault</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={() => setCurrentView('journal')} style={styles.addButton}>
                                <Ionicons name="add" size={20} color="#FFF" />
                                <Text style={styles.addButtonText}>New Entry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onQuickExit} style={styles.exitButton}>
                                <Ionicons name="exit-outline" size={24} color="#E53935" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={EVIDENCE_ITEMS}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={<Text style={styles.emptyText}>No evidence found.</Text>}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <Header onQuickExit={onQuickExit} />
            {renderTabContent()}
            <NavBar activeTab={activeTab} onTabPress={handleTabPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    tabContentWrapper: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        backgroundColor: '#FFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 15,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    exitButton: {
        padding: 5,
    },
    listContainer: {
        padding: 20,
    },
    evidenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    itemDate: {
        fontSize: 12,
        color: '#888',
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 40,
    }
});
