import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, SafeAreaView, Platform, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import JournalScreen from './JournalScreen';
import { NavBar, TabId } from '../components/NavBar';
import { ProfileScreen } from './ProfileScreen';
import { CheckInScreen } from './CheckInScreen';
import { AgentScreen } from './AgentScreen';
import { Header } from '../components/Header';

interface VaultScreenProps {
    onQuickExit: () => void;
    onLogout: () => void;
}

// Dummy evidence (fallback)
const EVIDENCE_ITEMS: any[] = [];

export const VaultScreen = ({ onQuickExit, onLogout }: VaultScreenProps) => {
    const [currentView, setCurrentView] = useState<'evidence' | 'journal'>('journal');
    const [activeTab, setActiveTab] = useState<TabId>('journal');

    // Filters and Sorting State
    const [dropdownVisible, setDropdownVisible] = useState<'none' | 'date' | 'type'>('none');
    const [dateSort, setDateSort] = useState<'newest' | 'oldest' | 'custom_7' | 'custom_30'>('newest');
    const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'Text' | 'Photo' | 'Video' | 'Audio'>('all');
    const [evidence, setEvidence] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'journal' && currentView === 'evidence') {
            fetchEvidence();
        }
    }, [activeTab, currentView]);

    const fetchEvidence = async () => {
        try {
            const data = await api.incidents.list();
            const mapped = data.map((item: any) => ({
                id: item.id,
                title: item.content ? (item.content.length > 30 ? item.content.substring(0, 30) + '...' : item.content) : `Entry ${item.type}`,
                type: item.type === 'note' ? 'Text' : (item.type.charAt(0).toUpperCase() + item.type.slice(1)),
                date: new Date(item.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }));
            setEvidence(mapped);
        } catch (error) {
            console.error('Failed to fetch evidence:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const getCategoryColors = (type: string) => {
        switch (type) {
            case 'Photo': return { color: '#4CAF50', bg: '#E8F5E9' };
            case 'Video': return { color: '#9C27B0', bg: '#F3E5F5' };
            case 'Audio': return { color: '#FF9800', bg: '#FFF3E0' };
            case 'Text': default: return { color: '#2196F3', bg: '#E3F2FD' };
        }
    };

    // Filtering and Sorting Logic
    const filteredEvidence = useMemo(() => {
        let result = [...evidence];

        // Filter by type
        if (evidenceFilter !== 'all') {
            result = result.filter(item => item.type === evidenceFilter);
        }

        // Filter by date range
        const now = new Date();
        // Since mock dates are in 2026, let's pretend 'now' is Oct 25, 2026 for demonstration if we want 7/30 days to work with mock data.
        // Or we just parse real time. Let's use real time parsing, if no items show, it's correct strictly speaking.
        if (dateSort === 'custom_7') {
            const past = new Date(); past.setDate(now.getDate() - 7);
            result = result.filter(item => new Date(item.date) >= past);
        } else if (dateSort === 'custom_30') {
            const past = new Date(); past.setDate(now.getDate() - 30);
            result = result.filter(item => new Date(item.date) >= past);
        }

        // Sort
        result.sort((a, b) => {
            const dA = new Date(a.date).getTime();
            const dB = new Date(b.date).getTime();
            if (dateSort === 'oldest') {
                return dA - dB;
            } else {
                return dB - dA; // newest default
            }
        });

        return result;
    }, [evidenceFilter, dateSort]);

    // Dropdown selection handlers
    const handleDateSelect = (val: typeof dateSort) => {
        setDateSort(val);
        setDropdownVisible('none');
    };

    const handleTypeSelect = (val: typeof evidenceFilter) => {
        setEvidenceFilter(val);
        setDropdownVisible('none');
    };

    const getDateLabel = () => {
        switch (dateSort) {
            case 'newest': return 'Newest first';
            case 'oldest': return 'Oldest first';
            case 'custom_7': return 'Last 7 days';
            case 'custom_30': return 'Last 30 days';
            default: return 'By Date';
        }
    };

    const getTypeLabel = () => {
        switch (evidenceFilter) {
            case 'all': return 'All Types';
            case 'Text': return 'Notes';
            case 'Photo': return 'Photos';
            case 'Video': return 'Videos';
            case 'Audio': return 'Audio';
            default: return 'By Type';
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const { color, bg } = getCategoryColors(item.type);
        return (
            <View style={styles.evidenceItem}>
                <View style={[styles.evidenceIconContainer, { backgroundColor: bg }]}>
                    <Ionicons
                        name={
                            item.type === 'Photo' ? 'image-outline' :
                                item.type === 'Video' ? 'videocam-outline' :
                                    item.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                        }
                        size={24}
                        color={color}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDate}>{item.date}</Text>
                </View>
            </View>
        );
    };

    const renderTabContent = () => {
        if (activeTab === 'profile') {
            return (
                <View style={styles.tabContentWrapper}>
                    <ProfileScreen onLogout={onLogout} />
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
                        </View>
                    </View>

                    <View style={styles.filterBar}>
                        <TouchableOpacity style={styles.filterDropdownButton} onPress={() => setDropdownVisible('date')}>
                            <Text style={styles.filterDropdownText}>{getDateLabel()}</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.filterDropdownButton} onPress={() => setDropdownVisible('type')}>
                            <Text style={styles.filterDropdownText}>{getTypeLabel()}</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 40 }} color="#4CAF50" />
                    ) : (
                        <FlatList
                            data={filteredEvidence}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={<Text style={styles.emptyText}>No evidence found match criteria.</Text>}
                        />
                    )}
                </View>

                {/* Dropdown Modal */}
                <Modal
                    visible={dropdownVisible !== 'none'}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDropdownVisible('none')}
                >
                    <TouchableWithoutFeedback onPress={() => setDropdownVisible('none')}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.dropdownMenu}>
                                    <Text style={styles.dropdownTitle}>
                                        {dropdownVisible === 'date' ? 'Sort by Date' : 'Filter by Type'}
                                    </Text>

                                    {dropdownVisible === 'date' && (
                                        <>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleDateSelect('newest')}>
                                                <Text style={[styles.dropdownOptionText, dateSort === 'newest' && styles.dropdownOptionTextActive]}>Newest first</Text>
                                                {dateSort === 'newest' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleDateSelect('oldest')}>
                                                <Text style={[styles.dropdownOptionText, dateSort === 'oldest' && styles.dropdownOptionTextActive]}>Oldest first</Text>
                                                {dateSort === 'oldest' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleDateSelect('custom_7')}>
                                                <Text style={[styles.dropdownOptionText, dateSort === 'custom_7' && styles.dropdownOptionTextActive]}>Last 7 days</Text>
                                                {dateSort === 'custom_7' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleDateSelect('custom_30')}>
                                                <Text style={[styles.dropdownOptionText, dateSort === 'custom_30' && styles.dropdownOptionTextActive]}>Last 30 days</Text>
                                                {dateSort === 'custom_30' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {dropdownVisible === 'type' && (
                                        <>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleTypeSelect('all')}>
                                                <Text style={[styles.dropdownOptionText, evidenceFilter === 'all' && styles.dropdownOptionTextActive]}>All</Text>
                                                {evidenceFilter === 'all' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleTypeSelect('Text')}>
                                                <Text style={[styles.dropdownOptionText, evidenceFilter === 'Text' && styles.dropdownOptionTextActive]}>Notes</Text>
                                                {evidenceFilter === 'Text' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleTypeSelect('Photo')}>
                                                <Text style={[styles.dropdownOptionText, evidenceFilter === 'Photo' && styles.dropdownOptionTextActive]}>Photos</Text>
                                                {evidenceFilter === 'Photo' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleTypeSelect('Video')}>
                                                <Text style={[styles.dropdownOptionText, evidenceFilter === 'Video' && styles.dropdownOptionTextActive]}>Videos</Text>
                                                {evidenceFilter === 'Video' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleTypeSelect('Audio')}>
                                                <Text style={[styles.dropdownOptionText, evidenceFilter === 'Audio' && styles.dropdownOptionTextActive]}>Audio</Text>
                                                {evidenceFilter === 'Audio' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

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
    evidenceIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
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
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    filterDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    filterDropdownText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownMenu: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        width: '80%',
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    dropdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        marginBottom: 5,
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    dropdownOptionText: {
        fontSize: 16,
        color: '#555',
    },
    dropdownOptionTextActive: {
        color: '#4CAF50',
        fontWeight: 'bold',
    }
});
