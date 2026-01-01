import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { getPlan, getExercise, TrainingPlan, Exercise } from '../../utils/api';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [exerciseDetails, setExerciseDetails] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const planData = await getPlan(id);
        setPlan(planData);
        
        // Load exercise details
        const details: Record<string, Exercise> = {};
        for (const ex of planData.exercises) {
          try {
            const exerciseData = await getExercise(ex.exercise_id);
            details[ex.exercise_id] = exerciseData;
          } catch {
            // Exercise might not exist
          }
        }
        setExerciseDetails(details);
      } catch (error) {
        console.error('Error loading plan:', error);
        Alert.alert('Fehler', 'Plan konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <Header title="Plan nicht gefunden" showBack />
      </View>
    );
  }

  const goalLabels: Record<string, string> = {
    weight_loss: 'Gewichtsverlust',
    muscle_gain: 'Muskelaufbau',
    mobility: 'Mobilität',
    endurance: 'Ausdauer',
    rehabilitation: 'Rehabilitation',
  };

  return (
    <View style={styles.container}>
      <Header title={plan.name} showBack />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Plan Header */}
        <View style={styles.planHeader}>
          <View style={styles.planIcon}>
            <Ionicons
              name={plan.is_ai_generated ? 'sparkles' : 'clipboard'}
              size={32}
              color="#6366f1"
            />
          </View>
          <View style={styles.planTags}>
            <View style={styles.goalTag}>
              <Text style={styles.goalText}>{goalLabels[plan.goal] || plan.goal}</Text>
            </View>
            {plan.is_ai_generated && (
              <View style={styles.aiTag}>
                <Ionicons name="sparkles" size={14} color="#a78bfa" />
                <Text style={styles.aiText}>KI-generiert</Text>
              </View>
            )}
          </View>
        </View>

        {plan.description && (
          <Text style={styles.description}>{plan.description}</Text>
        )}

        {/* Plan Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="barbell" size={20} color="#6366f1" />
            <Text style={styles.statValue}>{plan.exercises.length}</Text>
            <Text style={styles.statLabel}>Übungen</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={20} color="#22d3ee" />
            <Text style={styles.statValue}>{plan.days_per_week}x</Text>
            <Text style={styles.statLabel}>pro Woche</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color="#a78bfa" />
            <Text style={styles.statValue}>{plan.duration_weeks}</Text>
            <Text style={styles.statLabel}>Wochen</Text>
          </View>
        </View>

        {/* Exercises */}
        <Text style={styles.sectionTitle}>Übungen</Text>
        {plan.exercises.map((ex, index) => {
          const exerciseInfo = exerciseDetails[ex.exercise_id];
          return (
            <View key={`${ex.exercise_id}-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>
                  {exerciseInfo?.name_de || ex.exercise_id}
                </Text>
                <View style={styles.exerciseDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Sätze</Text>
                    <Text style={styles.detailValue}>{ex.sets}</Text>
                  </View>
                  {ex.reps && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Wdh.</Text>
                      <Text style={styles.detailValue}>{ex.reps}</Text>
                    </View>
                  )}
                  {ex.duration_seconds && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Dauer</Text>
                      <Text style={styles.detailValue}>{ex.duration_seconds}s</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pause</Text>
                    <Text style={styles.detailValue}>{ex.rest_seconds}s</Text>
                  </View>
                </View>
                {ex.notes && (
                  <Text style={styles.exerciseNotes}>{ex.notes}</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Start Workout Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title="Training starten"
          onPress={() => router.push(`/workout/start?planId=${plan.id}`)}
          icon="play"
          size="large"
          style={styles.startButton}
        />
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planTags: {
    flex: 1,
    gap: 8,
  },
  goalTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#6366f120',
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#a78bfa20',
    gap: 4,
  },
  aiText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a78bfa',
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  startButton: {
    width: '100%',
  },
});
