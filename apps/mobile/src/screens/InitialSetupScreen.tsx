import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

interface InitialSetupScreenProps {
    onComplete: () => void;
}

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onComplete }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [race, setRace] = useState('');
    const [hairColor, setHairColor] = useState('');
    const [eyeColor, setEyeColor] = useState('');

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Missing Info', 'Please provide at least your first and last name.');
            return;
        }

        const trimmedAge = age.trim();
        if (trimmedAge !== '') {
            if (!/^\d+$/.test(trimmedAge)) {
                Alert.alert('Invalid Age', 'Age must be a whole number.');
                return;
            }
            const ageNum = parseInt(trimmedAge, 10);
            if (ageNum < 0 || ageNum > 120) {
                Alert.alert('Invalid Age', 'Please enter a valid age between 0 and 120.');
                return;
            }
        }

        setSaving(true);
        try {
            await api.profile.update({
                firstName,
                lastName,
                age: trimmedAge,
                gender,
                race,
                hairColor,
                eyeColor
            });
            onComplete();
        } catch (error) {
            console.error('Failed to save profile setup:', error);
            Alert.alert('Error', 'Failed to save your information. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Ionicons name="person-add-outline" size={40} color="#E8956A" style={{ marginBottom: 12 }} />
                        <Text style={styles.headerTitle}>One more step</Text>
                        <Text style={styles.headerSubtitle}>
                            Please provide your physical description. This ensures emergency contacts and first responders have critical details if needed.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>First Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First Name"
                                placeholderTextColor="#C4A882"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Last Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Last Name"
                                placeholderTextColor="#C4A882"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <TextInput
                                    style={styles.input}
                                    value={age}
                                    onChangeText={setAge}
                                    placeholder="Age"
                                    keyboardType="numeric"
                                    placeholderTextColor="#C4A882"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.inputLabel}>Gender</Text>
                                <TextInput
                                    style={styles.input}
                                    value={gender}
                                    onChangeText={setGender}
                                    placeholder="Female, Male, etc."
                                    placeholderTextColor="#C4A882"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Race / Ethnicity</Text>
                            <TextInput
                                style={styles.input}
                                value={race}
                                onChangeText={setRace}
                                placeholder="Describe your race or ethnicity"
                                placeholderTextColor="#C4A882"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.inputLabel}>Hair Color</Text>
                                <TextInput
                                    style={styles.input}
                                    value={hairColor}
                                    onChangeText={setHairColor}
                                    placeholder="Hair Color"
                                    placeholderTextColor="#C4A882"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.inputLabel}>Eye Color</Text>
                                <TextInput
                                    style={styles.input}
                                    value={eyeColor}
                                    onChangeText={setEyeColor}
                                    placeholder="Eye Color"
                                    placeholderTextColor="#C4A882"
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.createBtn, saving && styles.createBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFAF5" />
                        ) : (
                            <Text style={styles.createBtnText}>Complete Profile</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9F5',
    },
    scroll: {
        paddingHorizontal: 28,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '300',
        color: '#4A3728',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        color: '#8D6E63',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    section: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4A3728',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F5EDE8',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#4A3728',
    },
    createBtn: {
        alignSelf: 'center',
        backgroundColor: '#E8956A',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 28,
        marginTop: 10,
        width: '100%',
        alignItems: 'center',
    },
    createBtnDisabled: {
        opacity: 0.7,
    },
    createBtnText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#FFFAF5',
        letterSpacing: 1,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333333',
    },
    modalOptionTextSelected: {
        fontWeight: 'bold',
        color: '#E8956A',
    },
});
