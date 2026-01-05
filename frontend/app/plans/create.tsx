import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { ExerciseCard } from '../../components/ExerciseCard';
import { getExercises, createPlan, Exercise, WorkoutExercise } from '../../utils/api';

export default function CreatePlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = await getExercises();
        setAvailableExercises(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading exercises:', error);
        setAvailableExercises([]);
      }
    };
    loadExercises();
  }, []);

  const goalOptions = [
    { id: 'weight_loss', label: 'Gewichtsverlust', icon: 'flame' },
    { id: 'muscle_gain', label: 'Muskelaufbau', icon: 'barbell' },
    { id: 'mobility', label: 'Mobilität', icon: 'body' },
    { id: 'endurance', label: 'Ausdauer', icon: 'heart' },
    { id: 'rehabilitation', label: 'Rehabilitation', icon: 'medkit' },
  ];

  const filteredExercises = (availableExercises || []).filter((ex) =>
    ex.name_de.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addExercise = (exercise: Exercise) => {
    if (selectedExercises.some((e) => e.exercise_id === exercise.id)) {
      return;
    }
    setSelectedExercises([
      ...selectedExercises,
      {
        exercise_id: exercise.id,
        sets: 3,
        reps: 10,
        rest_seconds: 60,
      },
    ]);
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter((e) => e.exercise_id !== exerciseId));
  };

  const updateExercise = (exerciseId: string, field: string, value: number) => {
    setSelectedExercises(
      selectedExercises.map((e) =>
        e.exercise_id === exerciseId ? { ...e, [field]: value } : e
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen für den Plan ein');
      return;
    }
    if (!goal) {
      Alert.alert('Fehler', 'Bitte wähle ein Trainingsziel');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Fehler', 'Bitte füge mindestens eine Übung hinzu');
      return;
    }

    setSaving(true);
    try {
      await createPlan({
        name,
        description,
        goal,
        days_per_week: daysPerWeek,
        duration_weeks: durationWeeks,
        exercises: selectedExercises,
        is_ai_generated: false,
      });
      Alert.alert('Erfolg', 'Trainingsplan erstellt!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Plan konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  };

  const getExerciseName = (exerciseId: string) => {
    const ex = availableExercises.find((e) => e.id === exerciseId);
    return ex?.name_de || exerciseId;
  };

  return (
    <View style={styles.container}>
      <Header title="Plan erstellen" showBack />
      
      {step === 1 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          <Text style={styles.stepTitle}>1. Grunddaten</Text>
          
          <Text style={styles.inputLabel}>Name des Plans</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="z.B. Mein Krafttraining"
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.inputLabel}>Beschreibung (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Kurze Beschreibung des Plans..."
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Trainingsziel</Text>
          <View style={styles.goalOptions}>
            {goalOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.goalOption, goal === opt.id && styles.goalOptionSelected]}
                onPress={() => setGoal(opt.id)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={24}
                  color={goal === opt.id ? '#fff' : '#6366f1'}
                />
                <Text style={[styles.goalText, goal === opt.id && styles.goalTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>Tage/Woche</Text>
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
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>Dauer (Wochen)</Text>
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

          <Button
            title="Weiter zu Übungen"
            onPress={() => setStep(2)}
            icon="arrow-forward"
            style={styles.nextButton}
          />
        </ScrollView>
      ) : (
        <View style={styles.exerciseSelection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Übung suchen..."
              placeholderTextColor="#6b7280"
            />
          </View>

          {selectedExercises.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedTitle}>
                Ausgewählt ({selectedExercises.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectedList}>
                  {selectedExercises.map((ex, index) => (
                    <View key={ex.exercise_id} style={styles.selectedItem}>
                      <Text style={styles.selectedItemNumber}>{index + 1}</Text>
                      <Text style={styles.selectedItemName} numberOfLines={1}>
                        {getExerciseName(ex.exercise_id)}
                      </Text>
                      <TouchableOpacity onPress={() => removeExercise(ex.exercise_id)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            renderItem={({ item }) => (
              <ExerciseCard
                exercise={item}
                onPress={() => addExercise(item)}
                selected={selectedExercises.some((e) => e.exercise_id === item.id)}
                showAddButton
                onAdd={() => addExercise(item)}
              />
            )}
          />

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <Button
              title="Zurück"
              onPress={() => setStep(1)}
              variant="outline"
              size="small"
              style={styles.backButton}
            />
            <Button
              title={`Plan speichern (${selectedExercises.length})`}
              onPress={handleSave}
              loading={saving}
              disabled={selectedExercises.length === 0}
              style={styles.saveButton}
            />
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  goalOptions: {
    gap: 12,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalOptionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  goalText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  goalTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  inputGroupSmall: {
    flex: 1,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  nextButton: {
    marginTop: 32,
  },
  exerciseSelection: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 16,
  },
  selectedSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  selectedList: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f120',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    gap: 6,
  },
  selectedItemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  selectedItemName: {
    fontSize: 13,
    color: '#fff',
    maxWidth: 100,
  },
  exerciseList: {
    padding: 16,
    paddingBottom: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
    gap: 12,
  },
  backButton: {
    width: 100,
  },
  saveButton: {
    flex: 1,
  },
});
