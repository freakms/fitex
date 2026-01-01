import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { generateAIPlan } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

export default function GenerateAIPlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const goalOptions = [
    { id: 'weight_loss', label: 'Gewichtsverlust', icon: 'flame', description: 'Fett verbrennen & Ausdauer steigern' },
    { id: 'muscle_gain', label: 'Muskelaufbau', icon: 'barbell', description: 'Kraft & Muskelmasse aufbauen' },
    { id: 'mobility', label: 'Mobilität', icon: 'body', description: 'Beweglichkeit & Flexibilität verbessern' },
    { id: 'endurance', label: 'Ausdauer', icon: 'heart', description: 'Kondition & Herz-Kreislauf stärken' },
    { id: 'rehabilitation', label: 'Rehabilitation', icon: 'medkit', description: 'Sanftes Training & Wiederherstellung' },
  ];

  const focusOptions = [
    'Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Bauch', 'Ganzkörper'
  ];

  const toggleFocus = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const hasProfile = user?.profile?.weight && user?.profile?.height;
  const hasAnamnesis = user?.anamnesis && Object.keys(user.anamnesis).length > 0;

  const handleGenerate = async () => {
    if (!goal) {
      Alert.alert('Fehler', 'Bitte wähle ein Trainingsziel');
      return;
    }

    setGenerating(true);
    try {
      const plan = await generateAIPlan({
        goal,
        days_per_week: daysPerWeek,
        duration_weeks: durationWeeks,
        focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
      });
      
      Alert.alert(
        'Plan erstellt!',
        `Dein KI-Trainingsplan "${plan.name}" wurde erfolgreich generiert.`,
        [
          { text: 'Anzeigen', onPress: () => router.replace(`/plans/${plan.id}`) },
        ]
      );
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Plan konnte nicht generiert werden');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="KI-Trainingsplan" showBack />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.aiHeader}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={40} color="#a78bfa" />
          </View>
          <Text style={styles.aiTitle}>KI-Trainingsplan Generator</Text>
          <Text style={styles.aiDescription}>
            Basierend auf deinem Profil und deinen gesundheitlichen Daten erstellt die KI einen
            personalisierten Trainingsplan für dich.
          </Text>
        </View>

        {(!hasProfile || !hasAnamnesis) && (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="warning" size={24} color="#fbbf24" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Profil unvollständig</Text>
              <Text style={styles.warningText}>
                Für optimale Ergebnisse solltest du dein Profil und deine Anamnese ausfüllen.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Trainingsziel</Text>
        {goalOptions.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.goalCard, goal === opt.id && styles.goalCardSelected]}
            onPress={() => setGoal(opt.id)}
          >
            <View style={[styles.goalIcon, goal === opt.id && styles.goalIconSelected]}>
              <Ionicons
                name={opt.icon as any}
                size={28}
                color={goal === opt.id ? '#fff' : '#6366f1'}
              />
            </View>
            <View style={styles.goalContent}>
              <Text style={[styles.goalLabel, goal === opt.id && styles.goalLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.goalDescription}>{opt.description}</Text>
            </View>
            {goal === opt.id && (
              <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Trainingsfrequenz</Text>
        <View style={styles.frequencyContainer}>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyLabel}>Tage pro Woche</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => daysPerWeek > 1 && setDaysPerWeek(daysPerWeek - 1)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{daysPerWeek}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => daysPerWeek < 7 && setDaysPerWeek(daysPerWeek + 1)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyLabel}>Dauer (Wochen)</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => durationWeeks > 1 && setDurationWeeks(durationWeeks - 1)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{durationWeeks}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => durationWeeks < 52 && setDurationWeeks(durationWeeks + 1)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fokus-Bereiche (optional)</Text>
        <View style={styles.focusOptions}>
          {focusOptions.map((area) => (
            <TouchableOpacity
              key={area}
              style={[
                styles.focusChip,
                focusAreas.includes(area) && styles.focusChipSelected,
              ]}
              onPress={() => toggleFocus(area)}
            >
              <Text
                style={[
                  styles.focusText,
                  focusAreas.includes(area) && styles.focusTextSelected,
                ]}
              >
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={generating ? 'Plan wird generiert...' : 'Plan generieren'}
          onPress={handleGenerate}
          loading={generating}
          disabled={!goal || generating}
          icon="sparkles"
          size="large"
          style={styles.generateButton}
        />

        {generating && (
          <Text style={styles.generatingText}>
            Die KI analysiert dein Profil und erstellt einen personalisierten Plan...
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  aiHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aiIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#a78bfa20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  aiDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf2410',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf2430',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
  },
  warningText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f110',
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIconSelected: {
    backgroundColor: '#6366f1',
  },
  goalContent: {
    flex: 1,
    marginLeft: 16,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  goalLabelSelected: {
    color: '#fff',
  },
  goalDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  frequencyItem: {
    flex: 1,
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 16,
  },
  frequencyLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
    textAlign: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  focusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  focusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1e1e32',
  },
  focusChipSelected: {
    backgroundColor: '#6366f1',
  },
  focusText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  focusTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  generateButton: {
    marginTop: 8,
  },
  generatingText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});
