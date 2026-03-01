import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import JournalScreen from './screens/JournalScreen';
import ViewEvidenceScreen from './screens/ViewEvidenceScreen';
import TextEvidenceScreen from './screens/evidence/TextEvidenceScreen';
import ImageEvidenceScreen from './screens/evidence/ImageEvidenceScreen';
import VideoEvidenceScreen from './screens/evidence/VideoEvidenceScreen';
import AudioEvidenceScreen from './screens/evidence/AudioEvidenceScreen';
import BottomNav from './components/BottomNav';

type Tab = 'Journal' | 'Check-in' | 'Agent' | 'Profile';
type Screen = 'Home' | 'ViewEvidence' | 'Text' | 'Image' | 'Video' | 'Audio';

export default function MainRouter() {
    const [activeTab, setActiveTab] = useState<Tab>('Journal');
    const [activeScreen, setActiveScreen] = useState<Screen>('Home');

    const renderScreen = () => {
        switch (activeScreen) {
            case 'Home':
                return <JournalScreen onViewEvidence={() => setActiveScreen('ViewEvidence')} />;
            case 'ViewEvidence':
                return (
                    <ViewEvidenceScreen
                        onBack={() => setActiveScreen('Home')}
                        onSelectCategory={(category) => setActiveScreen(category)}
                    />
                );
            case 'Text':
                return <TextEvidenceScreen onBack={() => setActiveScreen('ViewEvidence')} />;
            case 'Image':
                return <ImageEvidenceScreen onBack={() => setActiveScreen('ViewEvidence')} />;
            case 'Video':
                return <VideoEvidenceScreen onBack={() => setActiveScreen('ViewEvidence')} />;
            case 'Audio':
                return <AudioEvidenceScreen onBack={() => setActiveScreen('ViewEvidence')} />;
            default:
                return <JournalScreen onViewEvidence={() => setActiveScreen('ViewEvidence')} />;
        }
    };

    return (
        <View style={styles.container}>
            {renderScreen()}
            <BottomNav activeTab={activeTab} onTabPress={setActiveTab} />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
});
