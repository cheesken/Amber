import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'Journal' | 'Check-in' | 'Agent' | 'Profile';

interface BottomNavProps {
    activeTab: Tab;
    onTabPress: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
    const tabs: { name: Tab; icon: keyof typeof Ionicons.glyphMap }[] = [
        { name: 'Journal', icon: 'book-outline' },
        { name: 'Check-in', icon: 'pulse-outline' },
        { name: 'Agent', icon: 'call-outline' },
        { name: 'Profile', icon: 'person-outline' },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.name;
                const color = isActive ? '#FF9800' : '#9E9E9E';
                // Use filled icons when active
                const iconString = tab.icon as string;
                const iconName = isActive ? iconString.replace('-outline', '') as keyof typeof Ionicons.glyphMap : tab.icon;

                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => onTabPress(tab.name)}
                    >
                        <Ionicons name={iconName} size={24} color={color} />
                        <Text style={[styles.tabText, { color }]}>{tab.name}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingVertical: 10,
        paddingBottom: 25, // For safe area on devices without home button
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
    },
});
