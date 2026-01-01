import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getWorkoutStats, getPlans, WorkoutStats, TrainingPlan } from '../../utils/api';
import { Button } from '../../components/Button';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, plansData] = await Promise.all([
        getWorkoutStats(),
        getPlans(),
      ]);
      setStats(statsData);
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setPlans([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasProfile = user?.profile?.weight && user?.profile?.height;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.greeting}>Hallo, {user?.name?.split(' ')[0] || 'Athlet'}!</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="person-circle" size={44} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {!hasProfile && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="alert-circle" size={24} color="#fbbf24" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Profil vervollständigen</Text>
              <Text style={styles.alertText}>
                Füge deine Körperdaten hinzu für personalisierte Trainingspläne
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={28} color="#f97316" />
            <Text style={styles.statValue}>{stats?.streak_days || 0}</Text>
            <Text style={styles.statLabel}>Tage Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#22d3ee" />
            <Text style={styles.statValue}>{stats?.workouts_this_week || 0}</Text>
            <Text style={styles.statLabel}>Diese Woche</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#a78bfa" />
            <Text style={styles.statValue}>{stats?.total_duration_minutes || 0}</Text>
            <Text style={styles.statLabel}>Min. gesamt</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={28} color="#fbbf24" />
            <Text style={styles.statValue}>{stats?.total_workouts || 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schnellstart</Text>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#6366f120' }]}
              onPress={() => router.push('/workout/start')}
            >
              <Ionicons name="play-circle" size={32} color="#6366f1" />
              <Text style={styles.quickActionText}>Training starten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#22d3ee20' }]}
              onPress={() => router.push('/plans/create')}
            >
              <Ionicons name="add-circle" size={32} color="#22d3ee" />
              <Text style={styles.quickActionText}>Plan erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#a78bfa20' }]}
              onPress={() => router.push('/plans/generate')}
            >
              <Ionicons name="sparkles" size={32} color="#a78bfa" />
              <Text style={styles.quickActionText}>KI-Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meine Trainingspläne</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/plans')}>
              <Text style={styles.seeAll}>Alle anzeigen</Text>
            </TouchableOpacity>
          </View>
          {plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>Noch keine Trainingspläne</Text>
              <Button
                title="Ersten Plan erstellen"
                onPress={() => router.push('/plans/create')}
                variant="outline"
                size="small"
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            (plans || []).slice(0, 3).map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => router.push(`/plans/${plan.id}`)}
              >
                <View style={styles.planIcon}>
                  <Ionicons
                    name={plan.is_ai_generated ? 'sparkles' : 'clipboard'}
                    size={24}
                    color="#6366f1"
                  />
                </View>
                <View style={styles.planContent}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>
                    {plan.exercises.length} Übungen • {plan.days_per_week}x/Woche
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  date: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf2420',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fbbf2440',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
  },
  alertText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
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
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planContent: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  planMeta: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
});
