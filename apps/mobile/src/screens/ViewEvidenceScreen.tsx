import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ViewEvidenceScreenProps {
    onBack: () => void;
    onSelectCategory: (category: 'Text' | 'Image' | 'Video' | 'Audio') => void;
}

export default function ViewEvidenceScreen({ onBack, onSelectCategory }: ViewEvidenceScreenProps) {
    const categories = [
        { name: 'Text', icon: 'document-text-outline', color: '#4CAF50' },
        { name: 'Image', icon: 'image-outline', color: '#2196F3' },
        { name: 'Video', icon: 'videocam-outline', color: '#9C27B0' },
        { name: 'Audio', icon: 'mic-outline', color: '#FF9800' },
    ] as const;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                        <Text style={styles.headerTitle}>View Vault</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>Browse your previously saved evidence.</Text>

                <ScrollView contentContainerStyle={styles.gridContainer}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category.name}
                            style={styles.card}
                            onPress={() => onSelectCategory(category.name)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                                <Ionicons name={category.icon as any} size={40} color={category.color} />
                            </View>
                            <Text style={styles.cardTitle}>{category.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        paddingTop: 10,
        justifyContent: 'space-between',
    },
    card: {
        width: '47%',
        aspectRatio: 1, // Make them perfectly square
        backgroundColor: '#FFF',
        marginBottom: 15,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
});
