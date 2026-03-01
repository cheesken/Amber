import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
    firstName: string;
    lastName: string;
    gender: string;
    age: string;
    hairColor: string;
    eyeColor: string;
    race: string;
}

const INITIAL_PROFILE: UserProfile = {
    firstName: 'Jane',
    lastName: 'Doe',
    gender: '',
    age: '',
    hairColor: '',
    eyeColor: '',
    race: '',
};

export const ProfileScreen: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
    const [isGenderModalVisible, setIsGenderModalVisible] = useState(false);
    const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'];

    const updateField = (field: keyof UserProfile, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        // Here, we would make an API call to update the 'users' table in Supabase
        Alert.alert('Profile Saved', 'Your physical description has been securely saved.');
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Card */}
                <View style={styles.mainCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-circle-outline" size={28} color="#FA782F" />
                        </View>
                        <View style={styles.cardTitleContainer}>
                            <Text style={styles.cardTitle}>Your Identity</Text>
                            <Text style={styles.cardDescription}>
                                This physical description is used strictly if your emergency contacts need to provide details to first responders or authorities.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Form Elements */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Info</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            value={profile.firstName}
                            onChangeText={(text) => updateField('firstName', text)}
                            placeholder="First Name"
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            value={profile.lastName}
                            onChangeText={(text) => updateField('lastName', text)}
                            placeholder="Last Name"
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Physical Description</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Age</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.age}
                                onChangeText={(text) => updateField('age', text)}
                                placeholder="Age"
                                keyboardType="numeric"
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Gender</Text>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: 'center' }]}
                                onPress={() => setIsGenderModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: profile.gender ? '#333333' : '#A0A0A0', fontSize: 16 }}>
                                    {profile.gender || "Gender"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Race / Ethnicity</Text>
                        <TextInput
                            style={styles.input}
                            value={profile.race}
                            onChangeText={(text) => updateField('race', text)}
                            placeholder="Describe your race or ethnicity"
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>Hair Color</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.hairColor}
                                onChangeText={(text) => updateField('hairColor', text)}
                                placeholder="Hair Color"
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Eye Color</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.eyeColor}
                                onChangeText={(text) => updateField('eyeColor', text)}
                                placeholder="Eye Color"
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Save Profile Information</Text>
                </TouchableOpacity>

                {/* Bottom padding */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Gender Selection Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isGenderModalVisible}
                onRequestClose={() => setIsGenderModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsGenderModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Gender</Text>
                        {genderOptions.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.modalOption}
                                onPress={() => {
                                    updateField('gender', option);
                                    setIsGenderModalVisible(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    profile.gender === option && styles.modalOptionTextSelected
                                ]}>
                                    {option}
                                </Text>
                                {profile.gender === option && (
                                    <Ionicons name="checkmark" size={20} color="#FA782F" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contentContainer: {
        padding: 24,
    },
    mainCard: {
        backgroundColor: '#FFF9E6', // Amber theme soft yellow
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFECC7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5D4037', // Brown text fits amber theme
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 14,
        color: '#8D6E63',
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F7F7F7',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333333',
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#FA782F', // Amber primary orange
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        // Shadow
        shadowColor: '#FA782F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        color: '#FA782F',
    },
});
