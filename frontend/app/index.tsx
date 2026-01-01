import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="fitness" size={80} color="#6366f1" />
        </View>
        <Text style={styles.title}>FitGym</Text>
        <Text style={styles.subtitle}>Dein persönlicher Fitness-Trainer</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="barbell-outline" size={28} color="#6366f1" />
          <Text style={styles.featureText}>Über 50 Übungen</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="sparkles-outline" size={28} color="#6366f1" />
          <Text style={styles.featureText}>KI-Trainingspläne</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="trending-up-outline" size={28} color="#6366f1" />
          <Text style={styles.featureText}>Fortschritt tracken</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Anmelden"
          onPress={() => router.push('/auth/login')}
          size="large"
          style={styles.button}
        />
        <Button
          title="Registrieren"
          onPress={() => router.push('/auth/register')}
          variant="outline"
          size="large"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9ca3af',
    textAlign: 'center',
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e32',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  featureText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    width: '100%',
  },
});
