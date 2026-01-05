import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPlans, deletePlan, TrainingPlan } from '../../utils/api';
import { Button } from '../../components/Button';

export default function Plans() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const data = await getPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  };

  const handleDelete = (plan: TrainingPlan) => {
    Alert.alert(
      'Plan löschen',
      `Möchtest du "${plan.name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(plan.id);
              setPlans(plans.filter((p) => p.id !== plan.id));
            } catch (error) {
              Alert.alert('Fehler', 'Plan konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };

  const goalLabels: Record<string, string> = {
    weight_loss: 'Gewichtsverlust',
    muscle_gain: 'Muskelaufbau',
    mobility: 'Mobilität',
    endurance: 'Ausdauer',
    rehabilitation: 'Rehabilitation',
  };

  const renderPlan = ({ item }: { item: TrainingPlan }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => router.push(`/plans/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.planHeader}>
        <View style={styles.planIcon}>
          <Ionicons
            name={item.is_ai_generated ? 'sparkles' : 'clipboard'}
            size={28}
            color="#6366f1"
          />
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.planName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.planDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.planMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="barbell-outline" size={16} color="#9ca3af" />
          <Text style={styles.metaText}>{item.exercises.length} Übungen</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
          <Text style={styles.metaText}>{item.days_per_week}x/Woche</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#9ca3af" />
          <Text style={styles.metaText}>{item.duration_weeks} Wochen</Text>
        </View>
      </View>
      
      <View style={styles.planTags}>
        <View style={styles.goalTag}>
          <Text style={styles.goalText}>{goalLabels[item.goal] || item.goal}</Text>
        </View>
        {item.is_ai_generated && (
          <View style={styles.aiTag}>
            <Ionicons name="sparkles" size={12} color="#a78bfa" />
            <Text style={styles.aiText}>KI-generiert</Text>
          </View>
        )}
      </View>
      
      <Button
        title="Training starten"
        onPress={() => router.push(`/workout/start?planId=${item.id}`)}
        icon="play"
        size="small"
        style={styles.startButton}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Trainingspläne</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/plans/generate')}
          >
            <Ionicons name="sparkles" size={20} color="#a78bfa" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/plans/create')}
          >
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        renderItem={renderPlan}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyTitle}>Keine Trainingspläne</Text>
            <Text style={styles.emptyText}>
              Erstelle deinen ersten Trainingsplan manuell oder lass dir einen von der KI generieren.
            </Text>
            <View style={styles.emptyActions}>
              <Button
                title="Plan erstellen"
                onPress={() => router.push('/plans/create')}
                icon="add-circle"
                style={styles.emptyButton}
              />
              <Button
                title="KI-Plan generieren"
                onPress={() => router.push('/plans/generate')}
                variant="outline"
                icon="sparkles"
                style={styles.emptyButton}
              />
            </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  planCard: {
    backgroundColor: '#1e1e32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  planMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  planTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  goalTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6366f120',
  },
  goalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#a78bfa20',
    gap: 4,
  },
  aiText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a78bfa',
  },
  startButton: {
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyActions: {
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  emptyButton: {
    width: '100%',
  },
});
