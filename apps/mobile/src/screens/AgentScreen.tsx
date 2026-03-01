import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TranscriptMsg {
    speaker: 'AI Agent' | string;
    text: string;
}

interface CallHistoryItem {
    id: string;
    contactName: string;
    date: string;
    duration: string;
    transcript: TranscriptMsg[];
}

const MOCK_HISTORY: CallHistoryItem[] = [
    {
        id: '1',
        contactName: 'Eugene',
        date: '2/28/2026, 6:11:03 PM',
        duration: '2:25',
        transcript: [
            { speaker: 'AI Agent', text: "Hello, this is the Amber AI Assistant calling on behalf of your friend. They have requested that I share an update regarding a situation they are currently documenting." },
            { speaker: 'Eugene', text: "Oh, hi. Is everything okay? What's going on?" },
            { speaker: 'AI Agent', text: "They are currently safe, but they wanted you to be aware of a recent incident. According to their journal, there was an escalation earlier today involving verbal threats and broken property in the kitchen." },
            { speaker: 'Eugene', text: "That's terrible. Do they need me to come over or call the police?" },
            { speaker: 'AI Agent', text: "They have not requested police intervention at this time. They are using this app to securely document the pattern of behavior. They mostly wanted to ensure a trusted friend knew what was happening in case the situation worsens." },
            { speaker: 'Eugene', text: "Okay, understood. I'll send them a text right now to check in. Thank you for letting me know." },
            { speaker: 'AI Agent', text: "You are welcome. They have also selected you as a Tier 2 emergency contact, meaning you will be notified if they miss a scheduled safety check-in. Goodbye." }
        ]
    }
];

interface Contact {
    id: string;
    name: string;
    role: string;
    phone: string;
}

// Temporary dummy contacts until global state is implemented
const DUMMY_CONTACTS: Contact[] = [
    { id: '1', name: 'Eugene', role: 'FRIEND', phone: '123-456-7890' },
    { id: '2', name: 'Sarah', role: 'SISTER', phone: '098-765-4321' },
    { id: '3', name: 'Atty. Smith', role: 'LAWYER', phone: '555-555-5555' },
];

export const AgentScreen: React.FC = () => {

    const [isCallModalVisible, setIsCallModalVisible] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [selectedCall, setSelectedCall] = useState<CallHistoryItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // State to track if an agent call is currently in progress
    const [activeCallTargets, setActiveCallTargets] = useState<string[]>([]);

    // Using state for history so new calls can be added dynamically
    const [history, setHistory] = useState<CallHistoryItem[]>(MOCK_HISTORY);

    const handleCallAgent = () => {
        if (activeCallTargets.length > 0) return; // Prevent opening if already calling
        setIsCallModalVisible(true);
    };

    const toggleContactSelection = (id: string) => {
        const newSelection = new Set(selectedContacts);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedContacts(newSelection);
    };

    const confirmCall = () => {
        if (selectedContacts.size === 0) return;

        // Get names of the selected contacts for the progress UI
        const contactNames = DUMMY_CONTACTS
            .filter(c => selectedContacts.has(c.id))
            .map(c => c.name);

        setActiveCallTargets(contactNames);
        setIsCallModalVisible(false);
        setSelectedContacts(new Set());

        // Simulate a 5-second call, then end and add to history
        setTimeout(() => {
            const newHistoryItems: CallHistoryItem[] = contactNames.map(name => ({
                id: Math.random().toString(),
                contactName: name,
                date: new Date().toLocaleString(),
                duration: '0:05',
                transcript: [
                    { speaker: 'AI Agent', text: "Hello, this is the Amber AI Assistant calling to share a journal summary..." },
                    { speaker: name, text: "I understand. I will keep an eye out." }
                ]
            }));

            setHistory(prev => [...newHistoryItems, ...prev]);
            setActiveCallTargets([]); // End the call

        }, 5000);
    };

    return (
        <View style={styles.container}>

            {/* Header Text Section */}
            <View style={styles.headerSection}>
                <Text style={styles.title}>Agent Calling</Text>
                <Text style={styles.subtitle}>
                    If you want someone to know what you're going through, the AI Agent can help. It will summarize your recent journal entries and securely share them with the trusted contacts you select.
                </Text>
            </View>

            {/* Main Call Button Section */}
            <View style={styles.callSection}>
                <View style={[
                    styles.callButtonGlow,
                    activeCallTargets.length > 0 && styles.activeCallGlow
                ]}>
                    <TouchableOpacity
                        style={[
                            styles.callButton,
                            activeCallTargets.length > 0 && styles.activeCallButton
                        ]}
                        activeOpacity={0.8}
                        onPress={handleCallAgent}
                    >
                        <Ionicons
                            name={activeCallTargets.length > 0 ? "sync" : "call"}
                            size={48}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                </View>
                <View style={[
                    styles.callLabelContainer,
                    activeCallTargets.length > 0 && styles.activeCallLabelContainer
                ]}>
                    <Text style={[
                        styles.callLabelText,
                        activeCallTargets.length > 0 && styles.activeCallLabelText
                    ]}>
                        {activeCallTargets.length > 0
                            ? `Calling ${activeCallTargets.join(', ')}...`
                            : 'Agent-Call a Trusted Person'}
                    </Text>
                </View>
            </View>

            {/* Call History Section */}
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <Ionicons name="time-outline" size={20} color="#333333" />
                    <Text style={styles.historyTitle}>Call History</Text>
                </View>

                <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
                    {history.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.historyItem,
                                index === history.length - 1 && styles.lastHistoryItem
                            ]}
                            onPress={() => {
                                setSelectedCall(item);
                                setIsPlaying(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.historyItemLeft}>
                                <View style={styles.historyIconContainer}>
                                    <Ionicons name="call-outline" size={20} color="#FA782F" />
                                </View>
                                <View style={styles.historyItemTextContent}>
                                    <Text style={styles.historyItemName}>{item.contactName}</Text>
                                    <Text style={styles.historyItemDate}>{item.date}</Text>
                                </View>
                            </View>
                            <View style={styles.historyItemRight}>
                                <Text style={styles.historyItemDuration}>{item.duration}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#999999" style={styles.historyItemChevron} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Select Contacts Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isCallModalVisible}
                onRequestClose={() => setIsCallModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Who to call?</Text>
                            <TouchableOpacity onPress={() => setIsCallModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDescription}>
                            Select the contacts you want the AI agent to call and summarize your journal to.
                        </Text>

                        <ScrollView style={styles.contactsList}>
                            {DUMMY_CONTACTS.map((contact) => (
                                <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactOption}
                                    onPress={() => toggleContactSelection(contact.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.contactOptionInfo}>
                                        <View style={styles.historyIconContainer}>
                                            <Ionicons name="person-outline" size={20} color="#FA782F" />
                                        </View>
                                        <View>
                                            <Text style={styles.contactOptionName}>{contact.name}</Text>
                                            <Text style={styles.contactOptionRole}>{contact.role}</Text>
                                        </View>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        selectedContacts.has(contact.id) && styles.checkboxSelected
                                    ]}>
                                        {selectedContacts.has(contact.id) && (
                                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.confirmCallButton,
                                selectedContacts.size === 0 && styles.confirmCallButtonDisabled
                            ]}
                            onPress={confirmCall}
                            disabled={selectedContacts.size === 0}
                        >
                            <Ionicons name="call" size={20} color="#FFFFFF" style={styles.confirmCallIcon} />
                            <Text style={styles.confirmCallButtonText}>
                                Call {selectedContacts.size > 0 ? selectedContacts.size : ''} Contact{selectedContacts.size !== 1 ? 's' : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Call Details / Transcription Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={selectedCall !== null}
                onRequestClose={() => setSelectedCall(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.fullScreenModalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Call with {selectedCall?.contactName}</Text>
                                <Text style={styles.modalSubtitle}>{selectedCall?.date}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedCall(null)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Audio Player Mock */}
                        <View style={styles.audioPlayerCard}>
                            <TouchableOpacity
                                style={styles.playButton}
                                onPress={() => setIsPlaying(!isPlaying)}
                            >
                                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={styles.audioProgressContainer}>
                                <View style={styles.audioProgressBar}>
                                    <View style={[styles.audioProgressFill, { width: isPlaying ? '30%' : '0%' }]} />
                                </View>
                                <View style={styles.audioTimeRow}>
                                    <Text style={styles.audioTime}>{isPlaying ? '0:45' : '0:00'}</Text>
                                    <Text style={styles.audioTime}>{selectedCall?.duration}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.transcriptHeader}>Call Transcript</Text>

                        <ScrollView style={styles.transcriptList}>
                            {selectedCall?.transcript.map((msg, index) => {
                                const isAI = msg.speaker === 'AI Agent';
                                return (
                                    <View key={index} style={[
                                        styles.transcriptBubbleWrapper,
                                        isAI ? styles.transcriptBubbleWrapperLeft : styles.transcriptBubbleWrapperRight
                                    ]}>
                                        <Text style={styles.transcriptSpeaker}>{msg.speaker}</Text>
                                        <View style={[
                                            styles.transcriptBubble,
                                            isAI ? styles.transcriptBubbleLeft : styles.transcriptBubbleRight
                                        ]}>
                                            <Text style={[
                                                styles.transcriptText,
                                                isAI ? styles.transcriptTextLeft : styles.transcriptTextRight
                                            ]}>{msg.text}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                            {/* Bottom padding for scroll */}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Slight off-white to match the reference
        padding: 24, // Moved padding here from contentContainer
    },
    headerSection: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222222',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    callSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    callButtonGlow: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(250, 120, 47, 0.15)', // Soft amber glow
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    callButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FA782F', // Amber theme
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for depth
        shadowColor: '#FA782F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    callLabelContainer: {
        backgroundColor: '#FFF0E6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    callLabelText: {
        color: '#D85A14',
        fontWeight: 'bold',
        fontSize: 14,
    },
    activeCallGlow: {
        backgroundColor: 'rgba(76, 175, 80, 0.15)', // Green pulse
    },
    activeCallButton: {
        backgroundColor: '#4CAF50', // Green for active call
        shadowColor: '#4CAF50',
    },
    activeCallLabelContainer: {
        backgroundColor: '#E8F5E9',
    },
    activeCallLabelText: {
        color: '#2E7D32',
    },
    historyCard: {
        flex: 1, // Take up remaining vertical space
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden', // to keep border radius on top/bottom items clean
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        backgroundColor: '#FFFFFF', // Ensures header background is solid when sorting
        zIndex: 1, // Keeps header on top of scrollview contents
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginLeft: 10,
    },
    historyList: {
        flex: 1,
    },
    historyListContent: {
        paddingBottom: 20, // Add some padding to the bottom of the scroll list
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    lastHistoryItem: {
        borderBottomWidth: 0,
    },
    historyItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF9E6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    historyItemTextContent: {
        justifyContent: 'center',
    },
    historyItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 4,
    },
    historyItemDate: {
        fontSize: 12,
        color: '#999999',
    },
    historyItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyItemDuration: {
        fontSize: 13,
        color: '#999999',
        marginRight: 8,
    },
    historyItemChevron: {
        marginTop: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    fullScreenModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        height: '90%', // Taller for the transcript
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#999999',
        marginTop: 4,
    },
    // Audio Player Styles
    audioPlayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFECC7',
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FA782F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    audioProgressContainer: {
        flex: 1,
    },
    audioProgressBar: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    audioProgressFill: {
        height: '100%',
        backgroundColor: '#FA782F',
        borderRadius: 3,
    },
    audioTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    audioTime: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
    // Transcript Styles
    transcriptHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 16,
    },
    transcriptList: {
        flex: 1,
    },
    transcriptBubbleWrapper: {
        marginBottom: 16,
        maxWidth: '85%',
    },
    transcriptBubbleWrapperLeft: {
        alignSelf: 'flex-start',
    },
    transcriptBubbleWrapperRight: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    transcriptSpeaker: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 4,
        marginLeft: 4,
        marginRight: 4,
        fontWeight: '600',
    },
    transcriptBubble: {
        padding: 14,
        borderRadius: 16,
    },
    transcriptBubbleLeft: {
        backgroundColor: '#F5F5F5',
        borderBottomLeftRadius: 4,
    },
    transcriptBubbleRight: {
        backgroundColor: '#FA782F',
        borderBottomRightRadius: 4,
    },
    transcriptText: {
        fontSize: 15,
        lineHeight: 22,
    },
    transcriptTextLeft: {
        color: '#333333',
    },
    transcriptTextRight: {
        color: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    modalDescription: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 24,
        lineHeight: 20,
    },
    contactsList: {
        marginBottom: 20,
    },
    contactOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    contactOptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactOptionName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 4,
    },
    contactOptionRole: {
        fontSize: 12,
        color: '#999999',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkboxSelected: {
        backgroundColor: '#FA782F',
        borderColor: '#FA782F',
    },
    confirmCallButton: {
        flexDirection: 'row',
        backgroundColor: '#E53935', // Red action for confirming calls
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCallButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    confirmCallIcon: {
        marginRight: 8,
    },
    confirmCallButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
