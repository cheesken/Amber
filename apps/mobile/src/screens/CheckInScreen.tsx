import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Image,
    Dimensions,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Contact {
    id: string;
    name: string;
    role: string;
    phone: string;
}

const FREQUENCIES = [
    { id: 'daily', label: 'Daily' },
    { id: '2days', label: '2 Days' },
    { id: '7days', label: '7 Days' },
    { id: '14days', label: '14 Days' },
];

const INITIAL_CONTACTS: Contact[] = [
    { id: '1', name: 'Eugene', role: 'FRIEND', phone: '123456789' },
];

export const CheckInScreen: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [isCardExpanded, setIsCardExpanded] = useState(true);
    const [selectedFrequency, setSelectedFrequency] = useState('daily');
    const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const toggleSwitch = () => setIsEnabled(previousState => !previousState);

    const handleAddContact = () => {
        if (!newName.trim() || !newPhone.trim()) return;

        const newContact: Contact = {
            id: Math.random().toString(36).substr(2, 9),
            name: newName,
            role: newRole.toUpperCase(),
            phone: newPhone,
        };

        setContacts([...contacts, newContact]);
        setIsModalVisible(false);
        setNewName('');
        setNewPhone('');
        setNewRole('');
    };

    const deleteContact = (id: string) => {
        setContacts(contacts.filter(c => c.id !== id));
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Safety Check-in Card */}
                <View style={styles.mainCard}>
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={() => setIsCardExpanded(!isCardExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="time-outline" size={24} color="#FA782F" />
                        </View>
                        <View style={styles.cardTitleContainer}>
                            <View style={styles.titleRow}>
                                <Text style={styles.cardTitle}>Safety Check-in</Text>
                                <Ionicons
                                    name={isCardExpanded ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#FA782F"
                                />
                            </View>
                            {isCardExpanded && (
                                <Text style={styles.cardDescription}>
                                    If a check-in is missed, we’ll automatically notify your trusted contacts to reach out and ensure you’re safe.
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleText}>Enable Check-ins</Text>
                        <Switch
                            trackColor={{ false: "#D1D1D1", true: "#FA782F" }}
                            thumbColor={isEnabled ? "#FFFFFF" : "#F4F3F4"}
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                </View>

                {/* Check-in Frequency & Contacts (Conditional) */}
                {isEnabled && (
                    <>
                        {/* Check-in Frequency */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Check-in Frequency</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frequencyScroll}>
                                {FREQUENCIES.map((freq) => (
                                    <TouchableOpacity
                                        key={freq.id}
                                        style={[
                                            styles.frequencyCard,
                                            selectedFrequency === freq.id && styles.activeFrequencyCard
                                        ]}
                                        onPress={() => setSelectedFrequency(freq.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.frequencyLabel,
                                            selectedFrequency === freq.id && styles.activeFrequencyLabel
                                        ]}>
                                            {freq.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Trusted Contacts */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Trusted Contacts</Text>
                                {contacts.length < 5 && (
                                    <TouchableOpacity
                                        style={styles.addContactButton}
                                        onPress={() => setIsModalVisible(true)}
                                    >
                                        <Ionicons name="add" size={20} color="#FA782F" />
                                        <Text style={styles.addContactText}>Add Contact</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {contacts.map((contact) => (
                                <View key={contact.id} style={styles.contactCard}>
                                    <View style={styles.contactInfo}>
                                        <View style={styles.avatarContainer}>
                                            <Ionicons name="heart" size={20} color="#E65100" />
                                        </View>
                                        <View>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.contactName}>{contact.name}</Text>
                                                {contact.role !== '' && (
                                                    <View style={styles.roleBadge}>
                                                        <Text style={styles.roleText}>{contact.role}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.contactPhone}>{contact.phone}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.6}
                                        onPress={() => deleteContact(contact.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#999999" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Add Contact Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Contact</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Contact Name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Relationship</Text>
                            <TextInput
                                style={styles.input}
                                value={newRole}
                                onChangeText={setNewRole}
                                placeholder="Relationship (e.g. Sister, Lawyer, Friend)"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                                placeholder="+1 (000) 000-0000"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddContact}
                        >
                            <Text style={styles.saveButtonText}>Save Contact</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    mainCard: {
        backgroundColor: '#FFF9E6',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
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
        color: '#5D4037',
    },
    cardDescription: {
        fontSize: 13,
        color: '#8D6E63',
        lineHeight: 18,
        marginTop: 4,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 16,
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5D4037',
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
    frequencyScroll: {
        flexDirection: 'row',
        marginHorizontal: -4,
    },
    frequencyCard: {
        width: (width - 64) / 4,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    activeFrequencyCard: {
        backgroundColor: '#FA782F',
        borderColor: '#FA782F',
    },
    frequencyLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
        textAlign: 'center',
    },
    activeFrequencyLabel: {
        color: '#FFFFFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addContactButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addContactText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FA782F',
        marginLeft: 4,
    },
    contactCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        marginBottom: 12,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF9E6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginRight: 8,
    },
    roleBadge: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#999999',
    },
    contactPhone: {
        fontSize: 13,
        color: '#999999',
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
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#333333',
    },
    saveButton: {
        backgroundColor: '#FA782F',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
