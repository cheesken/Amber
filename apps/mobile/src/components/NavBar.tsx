import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TabId = 'journal' | 'checkin' | 'agent' | 'profile';

interface Tab {
    id: TabId;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon?: keyof typeof Ionicons.glyphMap;
}

interface NavBarProps {
    activeTab: TabId;
    onTabPress: (id: TabId) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onTabPress }) => {
    const tabs: Tab[] = [
        { id: 'journal', label: 'Journal', icon: 'book-outline', activeIcon: 'book' },
        { id: 'checkin', label: 'Check-in', icon: 'pulse-outline', activeIcon: 'pulse' },
        { id: 'agent', label: 'Agent', icon: 'call-outline', activeIcon: 'call' },
        { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
    ];

    return (
        <View style={styles.navBarContainer}>
            <View style={styles.navBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const iconName = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.tabItem}
                            onPress={() => onTabPress(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={iconName}
                                size={26}
                                color={isActive ? '#FA782F' : '#999999'}
                            />
                            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} />
        </View>
    );
};

const styles = StyleSheet.create({
    navBarContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 4,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    tabLabel: {
        fontSize: 11,
        marginTop: 4,
        color: '#999999',
        fontWeight: '500',
    },
    activeTabLabel: {
        color: '#FA782F',
        fontWeight: '600',
    },
});
