import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image, Alert, FlatList, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

type TabType = 'Text' | 'Photo' | 'Video' | 'Audio';

interface JournalScreenProps {
    onViewEvidence: () => void;
}

// Dummy journal history
const MOCK_JOURNAL_HISTORY = [
    { id: '1', title: 'Suspicious Car License', type: 'Text', date: 'Oct 24, 2026', content: 'Saw a dark sedan parked outside for three hours. License plate started with XYZ.' },
    { id: '2', title: 'Audio Argument', type: 'Audio', date: 'Oct 23, 2026', content: 'Recorded an audio of the argument occurring near the kitchen.' },
    { id: '3', title: 'Photo of broken window', type: 'Photo', date: 'Oct 21, 2026', content: 'Found the back window shattered. No sign of entry but very suspicious.' },
];

export default function JournalScreen({ onViewEvidence }: JournalScreenProps) {
    const [activeTab, setActiveTab] = useState<TabType>('Text');
    const [textEntry, setTextEntry] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);

    // State for viewing history details
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

    const handleMediaPress = () => {
        if (activeTab === 'Audio') {
            Alert.alert(
                'Add Audio',
                'Would you like to record a new voice memo or choose an audio file from your device?',
                [
                    {
                        text: 'Record Audio',
                        onPress: async () => {
                            try {
                                const permission = await Audio.requestPermissionsAsync();
                                if (permission.status !== 'granted') {
                                    Alert.alert('Permission Required', 'Sorry, we need microphone permissions to record audio!');
                                    return;
                                }

                                await Audio.setAudioModeAsync({
                                    allowsRecordingIOS: true,
                                    playsInSilentModeIOS: true,
                                });

                                const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                                setRecording(recording);
                                console.log('Starting recording...');
                            } catch (err) {
                                console.error('Failed to start recording', err);
                                Alert.alert('Error', 'Failed to start recording.');
                            }
                        },
                    },
                    {
                        text: 'Choose Audio File',
                        onPress: async () => {
                            let result = await DocumentPicker.getDocumentAsync({
                                type: 'audio/*',
                                copyToCacheDirectory: true,
                            });

                            if (!result.canceled) {
                                setAudioUri(result.assets[0].uri);
                            }
                        },
                    },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
            return;
        }

        const isPhoto = activeTab === 'Photo';
        const mediaTypeName = isPhoto ? 'Photo' : 'Video';

        Alert.alert(
            `Add ${mediaTypeName}`,
            `Would you like to take a new ${mediaTypeName.toLowerCase()} or choose from your library?`,
            [
                {
                    text: `Take ${mediaTypeName}`,
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Required', 'Sorry, we need camera permissions to make this work!');
                            return;
                        }

                        let result = await ImagePicker.launchCameraAsync({
                            mediaTypes: isPhoto ? ['images'] : ['videos'],
                            allowsEditing: true,
                            quality: 1,
                        });

                        if (!result.canceled) {
                            if (isPhoto) setImageUri(result.assets[0].uri);
                            else setVideoUri(result.assets[0].uri);
                        }
                    },
                },
                {
                    text: 'Choose from Library',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Required', 'Sorry, we need media library permissions to make this work!');
                            return;
                        }

                        let result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: isPhoto ? ['images'] : ['videos'],
                            allowsEditing: true,
                            quality: 1,
                        });

                        if (!result.canceled) {
                            if (isPhoto) setImageUri(result.assets[0].uri);
                            else setVideoUri(result.assets[0].uri);
                        }
                    },
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const stopRecording = async () => {
        if (!recording) return;

        console.log('Stopping recording...');
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setAudioUri(uri);
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const renderTabContent = () => {
        return (
            <View style={{ flex: 1 }}>
                <TextInput
                    style={[styles.textInput, { flex: activeTab === 'Text' ? 1 : 0.6 }]}
                    multiline
                    placeholder="Write what happened..."
                    placeholderTextColor="#999"
                    value={textEntry}
                    onChangeText={setTextEntry}
                />

                {activeTab !== 'Text' && (
                    <View style={styles.mediaUploadContainer}>
                        {(activeTab === 'Photo' && imageUri) ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setImageUri(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                        ) : (activeTab === 'Video' && videoUri) ? (
                            <View style={styles.imagePreviewContainer}>
                                <View style={[styles.previewImage, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="play-circle" size={64} color="#FFF" />
                                </View>
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setVideoUri(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                        ) : (activeTab === 'Audio' && recording) ? (
                            <View style={[styles.dashedUploadBox, { borderColor: '#E53935' }]}>
                                <Ionicons name="mic" size={32} color="#E53935" style={{ marginBottom: 10 }} />
                                <Text style={[styles.uploadText, { color: '#E53935' }]}>Recording in progress...</Text>
                                <TouchableOpacity
                                    style={{ marginTop: 15, backgroundColor: '#E53935', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}
                                    onPress={stopRecording}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Stop & Save</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (activeTab === 'Audio' && audioUri) ? (
                            <View style={styles.imagePreviewContainer}>
                                <View style={[styles.previewImage, { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="musical-notes" size={64} color="#4CAF50" />
                                    <Text style={{ marginTop: 10, color: '#4CAF50', fontWeight: 'bold' }}>Audio Saved</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setAudioUri(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.dashedUploadBox} onPress={handleMediaPress}>
                                <Ionicons
                                    name={
                                        activeTab === 'Photo' ? 'camera-outline' :
                                            activeTab === 'Video' ? 'videocam-outline' : 'mic-outline'
                                    }
                                    size={32}
                                    color="#999"
                                />
                                <Text style={styles.uploadText}>
                                    {activeTab === 'Photo' ? 'Tap to add image' :
                                        activeTab === 'Video' ? 'Tap to add video' :
                                            'Tap to add audio'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderHistoryItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.historyItem} onPress={() => setSelectedEntry(item)}>
            <View style={styles.historyIconContainer}>
                <Ionicons
                    name={
                        item.type === 'Photo' ? 'image-outline' :
                            item.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                    }
                    size={20}
                    color="#FA782F"
                />
            </View>
            <View style={styles.historyTextContainer}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? 25 : 45 }]}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={{ flex: 1, paddingBottom: 20 }}>
                    <View style={{ backgroundColor: '#FAFAFA' }}>
                        {/* Title & Save */}
                        <View style={styles.titleRow}>
                            <Text style={styles.pageTitle}>New Journal Entry</Text>
                            <View style={styles.actionsRow}>
                                <TouchableOpacity style={styles.viewButton} onPress={onViewEvidence}>
                                    <Ionicons name="folder-open-outline" size={16} color="#333" />
                                    <Text style={styles.viewText}>Vault</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabsContainer}>
                            {(['Text', 'Photo', 'Video', 'Audio'] as TabType[]).map((tab) => {
                                const isActive = activeTab === tab;
                                let iconName: keyof typeof Ionicons.glyphMap = 'text-outline';
                                if (tab === 'Photo') iconName = 'camera-outline';
                                if (tab === 'Video') iconName = 'videocam-outline';
                                if (tab === 'Audio') iconName = 'mic-outline';

                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tabButton, isActive && styles.activeTabButton]}
                                        onPress={() => {
                                            setActiveTab(tab);
                                            // Reset specific media states if jumping around (optional, keeping it simple for now)
                                        }}
                                    >
                                        <Ionicons name={iconName} size={18} color={isActive ? '#FFF' : '#666'} />
                                        <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Main Content Area (Upper Half) */}
                    <View style={styles.contentArea}>
                        {renderTabContent()}
                        <View style={{ alignItems: 'flex-end', marginTop: 15 }}>
                            <TouchableOpacity style={styles.saveButton}>
                                <Ionicons name="save-outline" size={16} color="#FFF" />
                                <Text style={styles.saveText}>Save Entry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* History Section (Lower Half) */}
                    <View style={[styles.historySection, { flex: 1 }]}>
                        <Text style={styles.historySectionTitle}>Recent Entries</Text>
                        <FlatList
                            data={MOCK_JOURNAL_HISTORY}
                            keyExtractor={item => item.id}
                            renderItem={renderHistoryItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.historyListContainer}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Detail View Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={selectedEntry !== null}
                onRequestClose={() => setSelectedEntry(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{selectedEntry?.title}</Text>
                            <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <View style={styles.detailBadgeRow}>
                                <View style={styles.detailBadge}>
                                    <Ionicons
                                        name={
                                            selectedEntry?.type === 'Photo' ? 'image-outline' :
                                                selectedEntry?.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                                        }
                                        size={14}
                                        color="#FA782F"
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.detailBadgeText}>{selectedEntry?.type}</Text>
                                </View>
                                <Text style={styles.detailDate}>{selectedEntry?.date}</Text>
                            </View>
                            <Text style={styles.detailContentText}>{selectedEntry?.content}</Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    container: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212121',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9800',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    saveText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 10,
    },
    viewText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
        width: '100%',
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    activeTabButton: {
        backgroundColor: '#212121',
        borderColor: '#212121',
    },
    tabText: {
        color: '#666',
        fontWeight: '600',
        marginLeft: 4,
        fontSize: 12,
    },
    activeTabText: {
        color: '#FFF',
    },
    contentArea: {
        minHeight: 250, // Let the entry area take up the top half
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    textInput: {
        fontSize: 16,
        color: '#333',
        textAlignVertical: 'top',
        minHeight: 120,
    },
    mediaUploadContainer: {
        flex: 0.4,
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
        paddingTop: 15,
        justifyContent: 'flex-end',
    },
    dashedUploadBox: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#D0D0D0',
        borderStyle: 'dashed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        minHeight: 100,
    },
    uploadText: {
        marginTop: 8,
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    imagePreviewContainer: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 100,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
    },
    historySection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    historySectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    historyListContainer: {
        paddingBottom: 20,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyTextContainer: {
        flex: 1,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 12,
        color: '#888',
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
        minHeight: '50%',
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
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    modalBody: {
        flex: 1,
    },
    detailBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10,
    },
    detailBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FA782F',
    },
    detailDate: {
        fontSize: 13,
        color: '#999',
    },
    detailContentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    }
});
