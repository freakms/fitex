import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getExercise, Exercise } from '../../utils/api';
import { Header } from '../../components/Header';

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell',
  cardio: 'heart',
  flexibility: 'body',
  bodyweight: 'fitness',
  rehabilitation: 'medkit',
};

const categoryLabels: Record<string, string> = {
  strength: 'Krafttraining',
  cardio: 'Ausdauer',
  flexibility: 'Dehnung & Mobilität',
  bodyweight: 'Körpergewicht',
  rehabilitation: 'Rehabilitation',
};

const difficultyColors: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#fbbf24',
  advanced: '#f87171',
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Profi',
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExercise = async () => {
      try {
        const data = await getExercise(id);
        setExercise(data);
      } catch (error) {
        console.error('Error loading exercise:', error);
      } finally {
        setLoading(false);
      }
    };
    loadExercise();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Header title="Übung nicht gefunden" showBack />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Übung konnte nicht geladen werden</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={exercise.name_de} showBack />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Category & Difficulty */}
        <View style={styles.tagsRow}>
          <View style={styles.categoryTag}>
            <Ionicons
              name={categoryIcons[exercise.category] || 'fitness'}
              size={18}
              color="#6366f1"
            />
            <Text style={styles.categoryText}>
              {categoryLabels[exercise.category] || exercise.category}
            </Text>
          </View>
          <View style={[styles.difficultyTag, { backgroundColor: difficultyColors[exercise.difficulty] + '20' }]}>
            <Text style={[styles.difficultyText, { color: difficultyColors[exercise.difficulty] }]}>
              {difficultyLabels[exercise.difficulty]}
            </Text>
          </View>
          {exercise.is_rehabilitation && (
            <View style={styles.rehabTag}>
              <Ionicons name="medkit" size={14} color="#22d3ee" />
              <Text style={styles.rehabText}>Reha</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschreibung</Text>
          <Text style={styles.description}>{exercise.description_de}</Text>
        </View>

        {/* Equipment */}
        {exercise.equipment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ausstattung</Text>
            <View style={styles.equipmentContainer}>
              <Ionicons name="fitness" size={20} color="#6366f1" />
              <Text style={styles.equipmentText}>{exercise.equipment}</Text>
            </View>
          </View>
        )}

        {/* Muscle Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muskelgruppen</Text>
          <View style={styles.muscleGroups}>
            {exercise.muscle_groups.map((muscle, index) => (
              <View key={index} style={styles.muscleTag}>
                <Text style={styles.muscleText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anleitung</Text>
          {exercise.instructions_de.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {/* Contraindications */}
        {exercise.contraindications.length > 0 && (
          <View style={[styles.section, styles.warningSection]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color="#fbbf24" />
              <Text style={styles.warningTitle}>Kontraindikationen</Text>
            </View>
            <Text style={styles.warningText}>
              Diese Übung sollte bei folgenden Beschwerden vermieden werden:
            </Text>
            <View style={styles.contraList}>
              {exercise.contraindications.map((contra, index) => (
                <View key={index} style={styles.contraItem}>
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text style={styles.contraText}>
                    {contra === 'knee' ? 'Knieprobleme' :
                     contra === 'shoulder' ? 'Schulterprobleme' :
                     contra === 'back' ? 'Rückenprobleme' :
                     contra === 'hip' ? 'Hüftprobleme' :
                     contra === 'ankle' ? 'Knöchelprobleme' : contra}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Calories */}
        {exercise.calories_per_minute && (
          <View style={styles.caloriesCard}>
            <Ionicons name="flame" size={24} color="#f97316" />
            <Text style={styles.caloriesValue}>
              ~{exercise.calories_per_minute} kcal/min
            </Text>
          </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6366f120',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  difficultyTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rehabTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#22d3ee20',
    gap: 6,
  },
  rehabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22d3ee',
  },
  section: {
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 24,
  },
  equipmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentText: {
    fontSize: 15,
    color: '#d1d5db',
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0f0f1a',
  },
  muscleText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 24,
    paddingTop: 2,
  },
  warningSection: {
    backgroundColor: '#fbbf2410',
    borderWidth: 1,
    borderColor: '#fbbf2430',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
  },
  warningText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  contraList: {
    gap: 8,
  },
  contraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contraText: {
    fontSize: 14,
    color: '#ef4444',
  },
  caloriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9731620',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f97316',
  },
});
