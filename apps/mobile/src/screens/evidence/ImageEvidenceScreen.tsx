import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageEvidenceScreenProps {
    onBack: () => void;
}

export default function ImageEvidenceScreen({ onBack }: ImageEvidenceScreenProps) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                        <Text style={styles.headerTitle}>Image Evidence</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.emptyStateContainer}>
                        <Ionicons name="image-outline" size={64} color="#ccc" style={styles.emptyIcon} />
                        <Text style={styles.emptyTitle}>No Image entries yet</Text>
                        <Text style={styles.emptySubtitle}>Photos you save will appear here.</Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF',
    },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 15, color: '#333' },
    content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyStateContainer: { alignItems: 'center', justifyContent: 'center' },
    emptyIcon: { marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
    emptySubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
});
