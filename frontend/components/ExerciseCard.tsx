import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../utils/api';

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
  selected?: boolean;
  showAddButton?: boolean;
  onAdd?: () => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell',
  cardio: 'heart',
  flexibility: 'body',
  bodyweight: 'fitness',
  rehabilitation: 'medkit',
};

const difficultyColors: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#fbbf24',
  advanced: '#f87171',
};

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onPress,
  selected,
  showAddButton,
  onAdd,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={categoryIcons[exercise.category] || 'fitness'}
          size={28}
          color="#6366f1"
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name}>{exercise.name_de}</Text>
        <View style={styles.tags}>
          <View style={[styles.difficultyTag, { backgroundColor: difficultyColors[exercise.difficulty] + '20' }]}>
            <Text style={[styles.difficultyText, { color: difficultyColors[exercise.difficulty] }]}>
              {exercise.difficulty === 'beginner' ? 'Anfänger' : 
               exercise.difficulty === 'intermediate' ? 'Fortgeschritten' : 'Profi'}
            </Text>
          </View>
          {exercise.is_rehabilitation && (
            <View style={styles.rehabTag}>
              <Ionicons name="medkit" size={12} color="#22d3ee" />
              <Text style={styles.rehabText}>Reha</Text>
            </View>
          )}
        </View>
        <Text style={styles.muscleGroups} numberOfLines={1}>
          {exercise.muscle_groups.join(', ')}
        </Text>
      </View>
      
      {showAddButton && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
        </TouchableOpacity>
      )}
      
      {!showAddButton && (
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#6366f1',
    backgroundColor: '#252540',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  difficultyTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rehabTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#22d3ee20',
  },
  rehabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22d3ee',
  },
  muscleGroups: {
    fontSize: 13,
    color: '#9ca3af',
  },
  addButton: {
    padding: 4,
  },
});
