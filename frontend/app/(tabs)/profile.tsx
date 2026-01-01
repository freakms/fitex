import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, updateAnamnesis } = useAuthStore();

  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    weight: user?.profile?.weight?.toString() || '',
    height: user?.profile?.height?.toString() || '',
    age: user?.profile?.age?.toString() || '',
    gender: user?.profile?.gender || '',
    fitness_goal: user?.profile?.fitness_goal || '',
    experience_level: user?.profile?.experience_level || '',
  });
  const [anamnesisData, setAnamnesisData] = useState({
    heart_conditions: user?.anamnesis?.heart_conditions || false,
    high_blood_pressure: user?.anamnesis?.high_blood_pressure || false,
    diabetes: user?.anamnesis?.diabetes || false,
    joint_problems: user?.anamnesis?.joint_problems || [],
    physical_limitations: user?.anamnesis?.physical_limitations || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        weight: profileData.weight ? parseFloat(profileData.weight) : undefined,
        height: profileData.height ? parseFloat(profileData.height) : undefined,
        age: profileData.age ? parseInt(profileData.age) : undefined,
        gender: profileData.gender || undefined,
        fitness_goal: profileData.fitness_goal || undefined,
        experience_level: profileData.experience_level || undefined,
      });
      await updateAnamnesis(anamnesisData);
      setEditMode(false);
      Alert.alert('Erfolg', 'Profil aktualisiert');
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const toggleJointProblem = (joint: string) => {
    setAnamnesisData((prev) => ({
      ...prev,
      joint_problems: prev.joint_problems.includes(joint)
        ? prev.joint_problems.filter((j) => j !== joint)
        : [...prev.joint_problems, joint],
    }));
  };

  const bmi = user?.profile?.bmi;
  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Untergewicht', color: '#fbbf24' };
    if (bmi < 25) return { label: 'Normalgewicht', color: '#4ade80' };
    if (bmi < 30) return { label: 'Übergewicht', color: '#fbbf24' };
    return { label: 'Adipositas', color: '#ef4444' };
  };

  const goalOptions = [
    { id: 'weight_loss', label: 'Gewichtsverlust' },
    { id: 'muscle_gain', label: 'Muskelaufbau' },
    { id: 'mobility', label: 'Mobilität' },
    { id: 'endurance', label: 'Ausdauer' },
    { id: 'rehabilitation', label: 'Rehabilitation' },
  ];

  const levelOptions = [
    { id: 'beginner', label: 'Anfänger' },
    { id: 'intermediate', label: 'Fortgeschritten' },
    { id: 'advanced', label: 'Profi' },
  ];

  const genderOptions = [
    { id: 'male', label: 'Männlich' },
    { id: 'female', label: 'Weiblich' },
    { id: 'other', label: 'Divers' },
  ];

  const jointOptions = ['knee', 'hip', 'shoulder', 'back', 'ankle'];
  const jointLabels: Record<string, string> = {
    knee: 'Knie',
    hip: 'Hüfte',
    shoulder: 'Schulter',
    back: 'Rücken',
    ankle: 'Knöchel',
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Profil</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Ionicons name={editMode ? 'close' : 'create'} size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#6366f1" />
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* BMI Card */}
        {bmi && (
          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <Text style={styles.bmiLabel}>BMI</Text>
              <View style={[styles.bmiStatus, { backgroundColor: getBMIStatus(bmi).color + '20' }]}>
                <Text style={[styles.bmiStatusText, { color: getBMIStatus(bmi).color }]}>
                  {getBMIStatus(bmi).label}
                </Text>
              </View>
            </View>
            <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
          </View>
        )}

        {/* Profile Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Körperdaten</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gewicht (kg)</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={profileData.weight}
                onChangeText={(v) => setProfileData({ ...profileData, weight: v })}
                keyboardType="numeric"
                editable={editMode}
                placeholder="70"
                placeholderTextColor="#6b7280"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Größe (cm)</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={profileData.height}
                onChangeText={(v) => setProfileData({ ...profileData, height: v })}
                keyboardType="numeric"
                editable={editMode}
                placeholder="175"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alter</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={profileData.age}
                onChangeText={(v) => setProfileData({ ...profileData, age: v })}
                keyboardType="numeric"
                editable={editMode}
                placeholder="30"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          {editMode && (
            <>
              <Text style={styles.inputLabel}>Geschlecht</Text>
              <View style={styles.optionsRow}>
                {genderOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optionChip,
                      profileData.gender === opt.id && styles.optionChipSelected,
                    ]}
                    onPress={() => setProfileData({ ...profileData, gender: opt.id })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        profileData.gender === opt.id && styles.optionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Fitness Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitnessziel</Text>
          <View style={styles.optionsWrap}>
            {goalOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionChip,
                  profileData.fitness_goal === opt.id && styles.optionChipSelected,
                  !editMode && styles.optionDisabled,
                ]}
                onPress={() => editMode && setProfileData({ ...profileData, fitness_goal: opt.id })}
                disabled={!editMode}
              >
                <Text
                  style={[
                    styles.optionText,
                    profileData.fitness_goal === opt.id && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Erfahrungslevel</Text>
          <View style={styles.optionsRow}>
            {levelOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionChip,
                  styles.optionChipFlex,
                  profileData.experience_level === opt.id && styles.optionChipSelected,
                  !editMode && styles.optionDisabled,
                ]}
                onPress={() => editMode && setProfileData({ ...profileData, experience_level: opt.id })}
                disabled={!editMode}
              >
                <Text
                  style={[
                    styles.optionText,
                    profileData.experience_level === opt.id && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Anamnesis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gesundheitliche Anamnese</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="heart" size={20} color="#ef4444" />
              <Text style={styles.switchText}>Herzrhythmusstörungen</Text>
            </View>
            <Switch
              value={anamnesisData.heart_conditions}
              onValueChange={(v) => setAnamnesisData({ ...anamnesisData, heart_conditions: v })}
              disabled={!editMode}
              trackColor={{ false: '#2d2d44', true: '#6366f180' }}
              thumbColor={anamnesisData.heart_conditions ? '#6366f1' : '#6b7280'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="water" size={20} color="#3b82f6" />
              <Text style={styles.switchText}>Bluthochdruck</Text>
            </View>
            <Switch
              value={anamnesisData.high_blood_pressure}
              onValueChange={(v) => setAnamnesisData({ ...anamnesisData, high_blood_pressure: v })}
              disabled={!editMode}
              trackColor={{ false: '#2d2d44', true: '#6366f180' }}
              thumbColor={anamnesisData.high_blood_pressure ? '#6366f1' : '#6b7280'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="nutrition" size={20} color="#f97316" />
              <Text style={styles.switchText}>Diabetes</Text>
            </View>
            <Switch
              value={anamnesisData.diabetes}
              onValueChange={(v) => setAnamnesisData({ ...anamnesisData, diabetes: v })}
              disabled={!editMode}
              trackColor={{ false: '#2d2d44', true: '#6366f180' }}
              thumbColor={anamnesisData.diabetes ? '#6366f1' : '#6b7280'}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Gelenkprobleme</Text>
          <View style={styles.optionsWrap}>
            {jointOptions.map((joint) => (
              <TouchableOpacity
                key={joint}
                style={[
                  styles.optionChip,
                  anamnesisData.joint_problems.includes(joint) && styles.optionChipSelected,
                  !editMode && styles.optionDisabled,
                ]}
                onPress={() => editMode && toggleJointProblem(joint)}
                disabled={!editMode}
              >
                <Text
                  style={[
                    styles.optionText,
                    anamnesisData.joint_problems.includes(joint) && styles.optionTextSelected,
                  ]}
                >
                  {jointLabels[joint]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {editMode && (
            <>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Weitere Einschränkungen</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={anamnesisData.physical_limitations}
                onChangeText={(v) => setAnamnesisData({ ...anamnesisData, physical_limitations: v })}
                placeholder="z.B. Bandscheibenvorfall, Asthma..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={3}
              />
            </>
          )}
        </View>

        {editMode && (
          <Button
            title="Speichern"
            onPress={handleSave}
            loading={saving}
            icon="checkmark"
            style={styles.saveButton}
          />
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  bmiCard: {
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bmiStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bmiStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0f0f1a',
  },
  optionChipFlex: {
    flex: 1,
    alignItems: 'center',
  },
  optionChipSelected: {
    backgroundColor: '#6366f1',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    fontSize: 15,
    color: '#fff',
  },
  saveButton: {
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ef444420',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
