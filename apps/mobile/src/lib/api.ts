import { Platform } from 'react-native';
import { getStoredUserId } from './auth';

// For iOS simulator, localhost/127.0.0.1 works. 
// For Android emulator, use 10.0.2.2.
// For physical devices, use the local IP of your machine.
const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';

// Helper to get the current authenticated user's ID
const getUserId = async (): Promise<string> => {
    const userId = await getStoredUserId();
    if (!userId) {
        throw new Error('User is not authenticated');
    }
    return userId;
};

// Helper for making API requests
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `API Error: ${response.status}`);
    }
    return response.json();
}

export const api = {
    profile: {
        get: async () => {
            const userId = await getUserId();
            const data = await apiFetch(`/profile/${userId}`);
            return {
                firstName: data.first_name || '',
                lastName: data.last_name || '',
                gender: data.gender || '',
                age: data.age !== null && data.age !== undefined ? data.age.toString() : '',
                hairColor: data.hair_color || '',
                eyeColor: data.eye_color || '',
                race: data.race || ''
            };
        },
        update: async (data: any) => {
            const userId = await getUserId();
            let finalGender = data.gender ? data.gender.trim().toLowerCase() : null;
            const validGenders = ['female', 'male', 'non-binary', 'prefer not to say', 'other'];
            if (finalGender && !validGenders.includes(finalGender)) {
                finalGender = 'other';
            }

            const payload = {
                first_name: data.firstName || null,
                last_name: data.lastName || null,
                gender: finalGender,
                age: data.age ? parseInt(data.age, 10) : null,
                hair_color: data.hairColor || null,
                eye_color: data.eyeColor || null,
                race: data.race || null
            };
            return apiFetch(`/profile/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        },
    },
    checkin: {
        getConfig: async () => {
            const userId = await getUserId();
            return apiFetch(`/checkin/config/${userId}`);
        },
        updateConfig: async (data: any) => {
            const userId = await getUserId();
            return apiFetch(`/checkin/config/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        perform: async () => {
            const userId = await getUserId();
            return apiFetch(`/checkin/${userId}`, {
                method: 'POST',
            });
        },
    },
    agent: {
        calls: {
            list: async () => {
                const userId = await getUserId();
                return apiFetch(`/agent/calls/${userId}`);
            },
            create: async (data: any) => {
                const userId = await getUserId();
                return apiFetch(`/agent/calls/${userId}`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            },
        },
    },
    contacts: {
        list: async () => {
            const userId = await getUserId();
            return apiFetch(`/contacts/${userId}`);
        },
        add: async (data: any) => {
            const userId = await getUserId();
            return apiFetch(`/contacts/${userId}`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        delete: async (contactId: string) => {
            const userId = await getUserId();
            return apiFetch(`/contacts/${userId}/${contactId}`, {
                method: 'DELETE',
            });
        },
    },
    incidents: {
        list: async () => {
            const userId = await getUserId();
            return apiFetch(`/incidents/${userId}`);
        },
        create: async (data: any) => {
            const userId = await getUserId();
            return apiFetch(`/incidents/${userId}`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        delete: async (incidentId: string) => {
            const userId = await getUserId();
            return apiFetch(`/incidents/${userId}/${incidentId}`, {
                method: 'DELETE',
            });
        },
    },
};
