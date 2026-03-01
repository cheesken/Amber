import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import JournalScreen from './screens/JournalScreen';
import ViewEvidenceScreen from './screens/ViewEvidenceScreen';
import TextEvidenceScreen from './screens/evidence/TextEvidenceScreen';
import ImageEvidenceScreen from './screens/evidence/ImageEvidenceScreen';
import VideoEvidenceScreen from './screens/evidence/VideoEvidenceScreen';
import AudioEvidenceScreen from './screens/evidence/AudioEvidenceScreen';
import { NavBar, TabId } from './components/NavBar';
import { Header } from './components/Header';
import { CheckInScreen } from './screens/CheckInScreen';
import { AgentScreen } from './screens/AgentScreen';
import { ProfileScreen } from './screens/ProfileScreen';

type Screen = 'Home' | 'ViewEvidence' | 'Text' | 'Image' | 'Video' | 'Audio';

interface MainRouterProps {
    onQuickExit?: () => void;
}

export default function MainRouter({ onQuickExit }: MainRouterProps) {
    const [activeTab, setActiveTab] = useState<TabId>('journal');
    const [activeScreen, setActiveScreen] = useState<Screen>('Home');

    const renderScreen = () => {
        if (activeTab === 'checkin') return <CheckInScreen />;
        if (activeTab === 'agent') return <AgentScreen />;
        if (activeTab === 'profile') return <ProfileScreen />;

        switch (activeScreen) {
            case 'Home':
                return <JournalScreen onViewEvidence={() => setActiveScreen('ViewEvidence')} />;
            case 'ViewEvidence':
                return (
                    <ViewEvidenceScreen
                        onBack={() => setActiveScreen('Home')}
                        onSelectCategory={(category) => setActiveScreen(category as Screen)}
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
            <Header onQuickExit={onQuickExit} />
            <View style={styles.content}>
                {renderScreen()}
            </View>
            <NavBar activeTab={activeTab} onTabPress={setActiveTab} />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    content: {
        flex: 1,
    }
});
