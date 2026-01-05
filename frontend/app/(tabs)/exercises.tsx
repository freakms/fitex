import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getExercises, getCategories, Exercise } from '../../utils/api';
import { ExerciseCard } from '../../components/ExerciseCard';

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function Exercises() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [exercisesData, categoriesData] = await Promise.all([
        getExercises(selectedCategory ? { category: selectedCategory } : undefined),
        getCategories(),
      ]);
      setExercises(Array.isArray(exercisesData) ? exercisesData : []);
      setCategories(Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      setExercises([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name_de.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscle_groups.some((mg) =>
      mg.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    strength: 'barbell',
    cardio: 'heart',
    flexibility: 'body',
    bodyweight: 'fitness',
    rehabilitation: 'medkit',
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Übungen</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Übung suchen..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={[{ id: null, name: 'Alle', icon: 'apps' }, ...categories]}
          keyExtractor={(item) => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Ionicons
                name={categoryIcons[item.id as string] || 'apps'}
                size={18}
                color={selectedCategory === item.id ? '#fff' : '#6366f1'}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item.id && styles.categoryTextSelected,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => router.push(`/exercise/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>Keine Übungen gefunden</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
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
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
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
  categoriesContainer: {
    backgroundColor: '#1a1a2e',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6366f120',
    marginRight: 8,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  exercisesList: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});
