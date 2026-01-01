import { create } from 'zustand';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use AsyncStorage for web compatibility
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch {}
  },
  deleteItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch {}
  }
};

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://091a90c6-f7cd-49da-b416-4f8d4526df40.preview.emergentagent.com/api';

interface UserProfile {
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  fitness_goal?: string;
  experience_level?: string;
  bmi?: number;
}

interface UserAnamnesis {
  heart_conditions: boolean;
  high_blood_pressure: boolean;
  diabetes: boolean;
  joint_problems: string[];
  other_conditions?: string;
  medications?: string;
  physical_limitations?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  profile?: UserProfile;
  anamnesis?: UserAnamnesis;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateAnamnesis: (anamnesis: UserAnamnesis) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ user, token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Anmeldung fehlgeschlagen');
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { email, password, name });
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ user, token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registrierung fehlgeschlagen');
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    delete axios.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token is still valid
        try {
          const response = await axios.get(`${API_URL}/auth/me`);
          set({ user: response.data, token, isAuthenticated: true, isLoading: false });
        } catch {
          // Token invalid, clear storage
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profile: UserProfile) => {
    try {
      const response = await axios.put(`${API_URL}/auth/profile`, profile);
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, profile: response.data.profile };
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Profil-Update fehlgeschlagen');
    }
  },

  updateAnamnesis: async (anamnesis: UserAnamnesis) => {
    try {
      const response = await axios.put(`${API_URL}/auth/anamnesis`, anamnesis);
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, anamnesis: response.data.anamnesis };
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Anamnese-Update fehlgeschlagen');
    }
  },

  refreshUser: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data));
      set({ user: response.data });
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  }
}));
