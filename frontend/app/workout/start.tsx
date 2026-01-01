import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import {
  getPlan,
  getExercise,
  logWorkout,
  getExercises,
  TrainingPlan,
  Exercise,
} from '../../utils/api';

interface ActiveExercise {
  exercise_id: string;
  name: string;
  sets: number;
  reps?: number;
  rest_seconds: number;
  completedSets: number;
  weight?: number;
}

export default function StartWorkout() {
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [workoutStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        if (planId) {
          const plan = await getPlan(planId);
          const loadedExercises: ActiveExercise[] = [];
          
          for (const ex of plan.exercises) {
            try {
              const exerciseData = await getExercise(ex.exercise_id);
              loadedExercises.push({
                exercise_id: ex.exercise_id,
                name: exerciseData.name_de,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                completedSets: 0,
                weight: ex.weight_kg,
              });
            } catch {
              loadedExercises.push({
                exercise_id: ex.exercise_id,
                name: ex.exercise_id,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                completedSets: 0,
              });
            }
          }
          setExercises(loadedExercises);
        } else {
          // Quick workout - load some default exercises
          const allExercises = await getExercises({ category: 'bodyweight' });
          const defaultExercises: ActiveExercise[] = allExercises.slice(0, 5).map((ex) => ({
            exercise_id: ex.id,
            name: ex.name_de,
            sets: 3,
            reps: 10,
            rest_seconds: 60,
            completedSets: 0,
          }));
          setExercises(defaultExercises);
        }
      } catch (error) {
        console.error('Error loading workout:', error);
        Alert.alert('Fehler', 'Workout konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };
    loadWorkout();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [planId]);

  const currentExercise = exercises[currentExerciseIndex];
  const isWorkoutComplete = exercises.every((ex) => ex.completedSets >= ex.sets);

  const startRest = (seconds: number) => {
    setIsResting(true);
    setRestTime(seconds);
    
    timerRef.current = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsResting(false);
          Vibration.vibrate(500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeSet = () => {
    if (!currentExercise) return;

    const updatedExercises = [...exercises];
    updatedExercises[currentExerciseIndex].completedSets += 1;
    setExercises(updatedExercises);

    const isLastSet = updatedExercises[currentExerciseIndex].completedSets >= currentExercise.sets;
    
    if (isLastSet) {
      // Move to next exercise
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    } else {
      // Start rest timer
      startRest(currentExercise.rest_seconds);
    }
  };

  const skipRest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsResting(false);
    setRestTime(0);
  };

  const finishWorkout = async () => {
    const durationMinutes = Math.round((Date.now() - workoutStartTime) / 60000);
    
    try {
      await logWorkout({
        plan_id: planId,
        date: new Date().toISOString().split('T')[0],
        exercises: exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets_completed: ex.completedSets,
          reps_completed: ex.reps,
          weight_used: ex.weight,
        })),
        duration_minutes: Math.max(durationMinutes, 1),
      });
      
      Alert.alert(
        'Workout abgeschlossen!',
        `Du hast ${durationMinutes} Minuten trainiert.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      Alert.alert('Fehler', 'Workout konnte nicht gespeichert werden');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = exercises.reduce((sum, ex) => sum + ex.completedSets, 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Workout" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Workout wird geladen...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Training" showBack />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedSets} / {totalSets} Sätze</Text>
      </View>

      {isResting ? (
        /* Rest Timer Screen */
        <View style={styles.restContainer}>
          <Text style={styles.restLabel}>PAUSE</Text>
          <Text style={styles.restTimer}>{formatTime(restTime)}</Text>
          <Text style={styles.restSubtext}>Nächste Übung wird gleich angezeigt</Text>
          <Button
            title="Pause überspringen"
            onPress={skipRest}
            variant="outline"
            style={styles.skipButton}
          />
        </View>
      ) : isWorkoutComplete ? (
        /* Workout Complete Screen */
        <View style={styles.completeContainer}>
          <View style={styles.completeIcon}>
            <Ionicons name="trophy" size={64} color="#fbbf24" />
          </View>
          <Text style={styles.completeTitle}>Geschafft!</Text>
          <Text style={styles.completeText}>
            Du hast alle {totalSets} Sätze abgeschlossen.
          </Text>
          <Button
            title="Workout beenden"
            onPress={finishWorkout}
            icon="checkmark"
            size="large"
            style={styles.finishButton}
          />
        </View>
      ) : (
        /* Active Exercise Screen */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        >
          {currentExercise && (
            <View style={styles.exerciseContainer}>
              <Text style={styles.exerciseLabel}>Übung {currentExerciseIndex + 1} von {exercises.length}</Text>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              
              <View style={styles.setsContainer}>
                {Array.from({ length: currentExercise.sets }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.setDot,
                      i < currentExercise.completedSets && styles.setDotCompleted,
                      i === currentExercise.completedSets && styles.setDotCurrent,
                    ]}
                  >
                    {i < currentExercise.completedSets && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.targetContainer}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>Satz</Text>
                  <Text style={styles.targetValue}>
                    {currentExercise.completedSets + 1} / {currentExercise.sets}
                  </Text>
                </View>
                {currentExercise.reps && (
                  <View style={styles.targetItem}>
                    <Text style={styles.targetLabel}>Wiederholungen</Text>
                    <Text style={styles.targetValue}>{currentExercise.reps}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Exercise List */}
          <Text style={styles.upcomingTitle}>Alle Übungen</Text>
          {exercises.map((ex, index) => (
            <TouchableOpacity
              key={`${ex.exercise_id}-${index}`}
              style={[
                styles.exerciseListItem,
                index === currentExerciseIndex && styles.exerciseListItemActive,
                ex.completedSets >= ex.sets && styles.exerciseListItemComplete,
              ]}
              onPress={() => setCurrentExerciseIndex(index)}
            >
              <View style={styles.exerciseListNumber}>
                {ex.completedSets >= ex.sets ? (
                  <Ionicons name="checkmark" size={16} color="#4ade80" />
                ) : (
                  <Text style={styles.exerciseListNumberText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.exerciseListContent}>
                <Text style={styles.exerciseListName}>{ex.name}</Text>
                <Text style={styles.exerciseListMeta}>
                  {ex.completedSets}/{ex.sets} Sätze {ex.reps ? `• ${ex.reps} Wdh.` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bottom Action */}
      {!isResting && !isWorkoutComplete && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            title="Satz abgeschlossen"
            onPress={completeSet}
            icon="checkmark-circle"
            size="large"
            style={styles.completeButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  restContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  restLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 16,
  },
  restTimer: {
    fontSize: 96,
    fontWeight: '700',
    color: '#fff',
  },
  restSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
  },
  skipButton: {
    marginTop: 32,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  completeIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fbbf2420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  completeText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  finishButton: {
    marginTop: 32,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  exerciseContainer: {
    backgroundColor: '#1e1e32',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  exerciseLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  setsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  setDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setDotCompleted: {
    backgroundColor: '#4ade80',
  },
  setDotCurrent: {
    backgroundColor: '#6366f1',
    borderWidth: 3,
    borderColor: '#6366f180',
  },
  targetContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseListItemActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f110',
  },
  exerciseListItemComplete: {
    opacity: 0.6,
  },
  exerciseListNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseListNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  exerciseListContent: {
    flex: 1,
  },
  exerciseListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  exerciseListMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
  completeButton: {
    width: '100%',
  },
});
