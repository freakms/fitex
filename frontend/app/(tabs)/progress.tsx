import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutStats, getWorkouts, WorkoutStats, WorkoutLog } from '../../utils/api';

const { width } = Dimensions.get('window');

export default function Progress() {
  const insets = useSafeAreaInsets();
  
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, workoutsData] = await Promise.all([
        getWorkoutStats(),
        getWorkouts(10),
      ]);
      setStats(statsData);
      setRecentWorkouts(workoutsData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Simple bar chart for last 7 days
  const last7Days = stats?.progress_data?.slice(-7) || [];
  const maxDuration = Math.max(...last7Days.map(d => d.duration), 1);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Fortschritt</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="flame" size={32} color="#f97316" />
            <Text style={styles.statValue}>{stats?.streak_days || 0}</Text>
            <Text style={styles.statLabel}>Tage Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#fbbf24" />
            <Text style={styles.statValue}>{stats?.total_workouts || 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#22d3ee" />
            <Text style={styles.statValue}>{stats?.workouts_this_week || 0}</Text>
            <Text style={styles.statLabel}>Diese Woche</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#a78bfa" />
            <Text style={styles.statValue}>{stats?.total_duration_minutes || 0}</Text>
            <Text style={styles.statLabel}>Minuten gesamt</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letzte 7 Tage</Text>
          <View style={styles.chartContainer}>
            {last7Days.map((day, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(day.duration / maxDuration) * 100}%`,
                        backgroundColor: day.duration > 0 ? '#6366f1' : '#2d2d44',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' }).charAt(0)}
                </Text>
                {day.duration > 0 && (
                  <Text style={styles.barValue}>{day.duration}m</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letzte Trainings</Text>
          {recentWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>Noch keine Trainings absolviert</Text>
            </View>
          ) : (
            recentWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                </View>
                <View style={styles.workoutContent}>
                  <Text style={styles.workoutDate}>
                    {new Date(workout.date).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.workoutMeta}>
                    {workout.exercises.length} Übungen • {workout.duration_minutes} Min.
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: '#6366f120',
    borderWidth: 1,
    borderColor: '#6366f140',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 24,
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  barValue: {
    fontSize: 10,
    color: '#6366f1',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1e1e32',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutIcon: {
    marginRight: 12,
  },
  workoutContent: {
    flex: 1,
  },
  workoutDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  workoutMeta: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
});
