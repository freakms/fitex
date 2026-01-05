import axios from 'axios';
import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://fitex.masexitus.de/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export interface Exercise {
  id: string;
  name: string;
  name_de: string;
  category: string;
  muscle_groups: string[];
  equipment?: string;
  difficulty: string;
  description: string;
  description_de: string;
  instructions: string[];
  instructions_de: string[];
  contraindications: string[];
  is_rehabilitation: boolean;
  calories_per_minute?: number;
}

export interface WorkoutExercise {
  exercise_id: string;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rest_seconds: number;
  notes?: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  goal: string;
  exercises: WorkoutExercise[];
  days_per_week: number;
  duration_weeks: number;
  is_ai_generated: boolean;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id?: string;
  date: string;
  exercises: any[];
  duration_minutes: number;
  notes?: string;
  created_at: string;
}

export interface WorkoutStats {
  total_workouts: number;
  total_duration_minutes: number;
  workouts_this_week: number;
  workouts_this_month: number;
  streak_days: number;
  progress_data: { date: string; workouts: number; duration: number }[];
}

// Exercises
export const getExercises = async (params?: {
  category?: string;
  muscle_group?: string;
  difficulty?: string;
  is_rehabilitation?: boolean;
}): Promise<Exercise[]> => {
  const response = await api.get('/exercises', { params });
  return response.data;
};

export const getExercise = async (id: string): Promise<Exercise> => {
  const response = await api.get(`/exercises/${id}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/exercises/categories/list');
  return response.data;
};

// Training Plans
export const getPlans = async (): Promise<TrainingPlan[]> => {
  const response = await api.get('/plans');
  return response.data;
};

export const getPlan = async (id: string): Promise<TrainingPlan> => {
  const response = await api.get(`/plans/${id}`);
  return response.data;
};

export const createPlan = async (plan: Partial<TrainingPlan>): Promise<TrainingPlan> => {
  const response = await api.post('/plans', plan);
  return response.data;
};

export const updatePlan = async (id: string, plan: Partial<TrainingPlan>): Promise<TrainingPlan> => {
  const response = await api.put(`/plans/${id}`, plan);
  return response.data;
};

export const deletePlan = async (id: string): Promise<void> => {
  await api.delete(`/plans/${id}`);
};

export const generateAIPlan = async (request: {
  goal: string;
  goals?: string[];
  days_per_week: number;
  duration_weeks: number;
  focus_areas?: string[];
}): Promise<TrainingPlan> => {
  const response = await api.post('/plans/generate', request);
  return response.data;
};

// Workout Logs
export const getWorkouts = async (limit?: number, skip?: number): Promise<WorkoutLog[]> => {
  const response = await api.get('/workouts', { params: { limit, skip } });
  return response.data;
};

export const logWorkout = async (workout: Partial<WorkoutLog>): Promise<WorkoutLog> => {
  const response = await api.post('/workouts', workout);
  return response.data;
};

export const getWorkoutStats = async (): Promise<WorkoutStats> => {
  const response = await api.get('/workouts/stats');
  return response.data;
};

export const getExerciseProgress = async (exerciseId: string) => {
  const response = await api.get(`/progress/exercise/${exerciseId}`);
  return response.data;
};
