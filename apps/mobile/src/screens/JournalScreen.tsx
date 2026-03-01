import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image, Alert, FlatList, Modal, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

type TabType = 'Text' | 'Photo' | 'Video' | 'Audio';

interface JournalScreenProps {
    onViewEvidence: () => void;
}

// Dummy journal history (fallback)
const MOCK_JOURNAL_HISTORY = [
    { id: '1', title: 'Suspicious Car License', type: 'Text', date: 'Oct 24, 2026', content: 'Saw a dark sedan parked outside for three hours. License plate started with XYZ.' },
];

const AudioPlayer = ({ uri }: { uri: string }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);

    async function playSound() {
        try {
            // CRITICAL: Set allowsRecordingIOS to false to ensure audio routes to the main speaker, not the earpiece.
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: false,
            });

            if (sound) {
                await sound.setVolumeAsync(1.0);
                await sound.playAsync();
                setIsPlaying(true);
                return;
            }

            setLoading(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true, volume: 1.0 }
            );
            setSound(newSound);
            setIsPlaying(true);
            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) {
                    setIsPlaying(false);
                    newSound.setPositionAsync(0);
                    newSound.pauseAsync();
                }
            });
        } catch (error) {
            console.error('Error loading sound', error);
            Alert.alert('Error', 'Failed to load audio.');
        } finally {
            setLoading(false);
        }
    }

    async function pauseSound() {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    }

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    return (
        <View style={[styles.detailImage, { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }]}>
            <TouchableOpacity
                onPress={isPlaying ? pauseSound : playSound}
                disabled={loading}
                style={{ alignItems: 'center' }}
            >
                {loading ? (
                    <ActivityIndicator color="#4CAF50" />
                ) : (
                    <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={64} color="#4CAF50" />
                )}
                <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginTop: 8 }}>
                    {isPlaying ? 'Playing...' : 'Tap to Play'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default function JournalScreen({ onViewEvidence }: JournalScreenProps) {
    const [activeTab, setActiveTab] = useState<TabType>('Text');
    const [textEntry, setTextEntry] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);

    // State for viewing history details
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchHistory();
        // Initialize audio mode
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
        }).catch(err => console.log('Audio init failed', err));
    }, []);

    const fetchHistory = async () => {
        try {
            const data = await api.incidents.list();
            // Map backend fields to frontend model
            const mapped = data.map((item: any) => ({
                id: item.id,
                title: item.content ? (item.content.length > 30 ? item.content.substring(0, 30) + '...' : item.content) : `Entry ${item.type}`,
                type: item.type === 'note' ? 'Text' : (item.type.charAt(0).toUpperCase() + item.type.slice(1)),
                date: new Date(item.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                content: item.content || `Entry of type ${item.type}`,
                file_url: item.file_url
            }));
            setHistory(mapped);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!textEntry.trim() && !imageUri && !videoUri && !audioUri) {
            Alert.alert('Empty Entry', 'Please add some text or media before saving.');
            return;
        }

        setSaving(true);
        try {
            const typeMap: any = { 'Text': 'note', 'Photo': 'photo', 'Video': 'video', 'Audio': 'audio' };
            const incidentType = typeMap[activeTab];

            const formData = new FormData();
            formData.append('type', incidentType);
            if (textEntry.trim()) {
                formData.append('content', textEntry);
            }

            const mediaUri = imageUri || videoUri || audioUri;
            if (mediaUri) {
                // Extract filename and mime type
                const filename = mediaUri.split('/').pop() || 'upload';

                let mimeType = 'application/octet-stream';
                if (incidentType === 'photo') mimeType = 'image/jpeg';
                else if (incidentType === 'video') mimeType = 'video/mp4';
                else if (incidentType === 'audio') {
                    // Expo iOS recordings are typically .m4a
                    mimeType = filename.endsWith('.m4a') ? 'audio/x-m4a' : 'audio/mpeg';
                }

                formData.append('file', {
                    uri: mediaUri,
                    name: filename,
                    type: mimeType
                } as any);
            }

            await api.incidents.create(formData);

            Alert.alert('Success', 'Entry submitted to your secure vault.');
            setTextEntry('');
            setImageUri(null);
            setVideoUri(null);
            setAudioUri(null);
            fetchHistory();
        } catch (error) {
            console.error('Failed to save entry:', error);
            Alert.alert('Error', 'Failed to submit entry to server.');
        } finally {
            setSaving(false);
        }
    };

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
                                <View style={[styles.previewImage, { backgroundColor: '#E8F5E9', padding: 10 }]}>
                                    <AudioPlayer uri={audioUri} />
                                    <View style={{ alignItems: 'center', marginTop: -20 }}>
                                        <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Recording Ready</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setAudioUri(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#FF5252" />
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

    const getCategoryColors = (type: string) => {
        switch (type) {
            case 'Photo': return { color: '#4CAF50', bg: '#E8F5E9' };
            case 'Video': return { color: '#9C27B0', bg: '#F3E5F5' };
            case 'Audio': return { color: '#FF9800', bg: '#FFF3E0' };
            case 'Text': default: return { color: '#2196F3', bg: '#E3F2FD' };
        }
    };

    const renderHistoryItem = ({ item }: { item: any }) => {
        const { color, bg } = getCategoryColors(item.type);
        return (
            <TouchableOpacity style={styles.historyItem} onPress={() => setSelectedEntry(item)}>
                <View style={[styles.historyIconContainer, { backgroundColor: bg }]}>
                    <Ionicons
                        name={
                            item.type === 'Photo' ? 'image-outline' :
                                item.type === 'Video' ? 'videocam-outline' :
                                    item.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                        }
                        size={20}
                        color={color}
                    />
                </View>
                <View style={styles.historyTextContainer}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.safeArea}>
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
                            <TouchableOpacity
                                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={16} color="#FFF" />
                                        <Text style={styles.saveText}>Submit Entry</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* History Section (Lower Half) */}
                    <View style={[styles.historySection, { flex: 1 }]}>
                        <Text style={styles.historySectionTitle}>Recent Entries</Text>
                        <FlatList
                            data={history}
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
                                <View style={[styles.detailBadge, { backgroundColor: selectedEntry ? getCategoryColors(selectedEntry.type).bg : '#FFF9E6' }]}>
                                    <Ionicons
                                        name={
                                            selectedEntry?.type === 'Photo' ? 'image-outline' :
                                                selectedEntry?.type === 'Video' ? 'videocam-outline' :
                                                    selectedEntry?.type === 'Audio' ? 'mic-outline' : 'document-text-outline'
                                        }
                                        size={14}
                                        color={selectedEntry ? getCategoryColors(selectedEntry.type).color : '#FA782F'}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.detailBadgeText, { color: selectedEntry ? getCategoryColors(selectedEntry.type).color : '#FA782F' }]}>{selectedEntry?.type}</Text>
                                </View>
                                <Text style={styles.detailDate}>{selectedEntry?.date}</Text>
                            </View>

                            {selectedEntry?.type === 'Photo' && selectedEntry.file_url && (
                                <View style={styles.modalMediaContainer}>
                                    <Image source={{ uri: selectedEntry.file_url }} style={styles.detailImage} />
                                </View>
                            )}

                            {selectedEntry?.type === 'Video' && selectedEntry.file_url && (
                                <View style={styles.modalMediaContainer}>
                                    <Video
                                        source={{ uri: selectedEntry.file_url }}
                                        rate={1.0}
                                        volume={1.0}
                                        isMuted={false}
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay={false}
                                        isLooping={false}
                                        useNativeControls
                                        style={styles.detailImage}
                                    />
                                </View>
                            )}

                            {selectedEntry?.type === 'Audio' && selectedEntry.file_url && (
                                <View style={styles.modalMediaContainer}>
                                    <AudioPlayer uri={selectedEntry.file_url} />
                                </View>
                            )}

                            {selectedEntry?.content && (
                                <Text style={styles.detailContentText}>{selectedEntry.content}</Text>
                            )}
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
        paddingHorizontal: 16,
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
        paddingHorizontal: 16,
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
        marginHorizontal: 16,
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
        marginHorizontal: 16,
        marginBottom: 16,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10,
    },
    detailBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailDate: {
        fontSize: 13,
        color: '#999',
    },
    detailContentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    modalMediaContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#F5F5F5',
    },
    detailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
