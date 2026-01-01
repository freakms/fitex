from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fitgym_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'fitgym-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# OpenAI Configuration
EMERGENT_LLM_KEY = "sk-emergent-543338e18E701109a5"
INTEGRATION_PROXY_URL = os.environ.get('INTEGRATION_PROXY_URL', 'https://integrations.emergentagent.com')

# Initialize OpenAI client - will be used with proper integration
openai_client = None

def get_openai_client():
    global openai_client
    if openai_client is None:
        openai_client = OpenAI(
            api_key=EMERGENT_LLM_KEY,
            base_url=f"{INTEGRATION_PROXY_URL}/openai/v1"
        )
    return openai_client

app = FastAPI(title="FitGym API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    weight: Optional[float] = None  # kg
    height: Optional[float] = None  # cm
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    fitness_goal: Optional[str] = None  # weight_loss, muscle_gain, mobility, endurance, rehabilitation
    experience_level: Optional[str] = None  # beginner, intermediate, advanced

class UserAnamnesis(BaseModel):
    heart_conditions: bool = False
    high_blood_pressure: bool = False
    diabetes: bool = False
    joint_problems: Optional[List[str]] = []  # knee, hip, shoulder, back, ankle
    other_conditions: Optional[str] = None
    medications: Optional[str] = None
    physical_limitations: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    profile: Optional[Dict] = None
    anamnesis: Optional[Dict] = None
    created_at: str

class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_de: str
    category: str  # strength, cardio, flexibility, rehabilitation, bodyweight
    muscle_groups: List[str]
    equipment: Optional[str] = None
    difficulty: str  # beginner, intermediate, advanced
    description: str
    description_de: str
    instructions: List[str]
    instructions_de: List[str]
    contraindications: List[str] = []  # List of conditions where exercise should be avoided
    is_rehabilitation: bool = False
    calories_per_minute: Optional[float] = None

class WorkoutExercise(BaseModel):
    exercise_id: str
    sets: int = 3
    reps: Optional[int] = 10
    duration_seconds: Optional[int] = None
    weight_kg: Optional[float] = None
    rest_seconds: int = 60
    notes: Optional[str] = None

class TrainingPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    goal: str  # weight_loss, muscle_gain, mobility, endurance, rehabilitation
    exercises: List[WorkoutExercise]
    days_per_week: int = 3
    duration_weeks: int = 4
    is_ai_generated: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorkoutLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_id: Optional[str] = None
    date: str
    exercises: List[Dict]  # exercise_id, sets_completed, reps_completed, weight_used
    duration_minutes: int
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AITrainingPlanRequest(BaseModel):
    goal: str
    days_per_week: int = 3
    duration_weeks: int = 4
    focus_areas: Optional[List[str]] = None  # specific muscle groups or areas

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hash_password(user.password),
        "profile": {},
        "anamnesis": {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email)
    return {"token": token, "user": {"id": user_id, "email": user.email, "name": user.name}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "profile": user.get("profile", {}),
            "anamnesis": user.get("anamnesis", {})
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "profile": user.get("profile", {}),
        "anamnesis": user.get("anamnesis", {}),
        "created_at": user.get("created_at")
    }

@api_router.put("/auth/profile")
async def update_profile(profile: UserProfile, user: dict = Depends(get_current_user)):
    profile_data = profile.model_dump(exclude_none=True)
    
    # Calculate BMI if weight and height provided
    if profile.weight and profile.height:
        height_m = profile.height / 100
        profile_data["bmi"] = round(profile.weight / (height_m * height_m), 1)
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": profile_data}})
    return {"message": "Profil aktualisiert", "profile": profile_data}

@api_router.put("/auth/anamnesis")
async def update_anamnesis(anamnesis: UserAnamnesis, user: dict = Depends(get_current_user)):
    anamnesis_data = anamnesis.model_dump()
    await db.users.update_one({"id": user["id"]}, {"$set": {"anamnesis": anamnesis_data}})
    return {"message": "Anamnese aktualisiert", "anamnesis": anamnesis_data}

# ============== EXERCISES ROUTES ==============

@api_router.get("/exercises")
async def get_exercises(
    category: Optional[str] = None,
    muscle_group: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_rehabilitation: Optional[bool] = None
):
    query = {}
    if category:
        query["category"] = category
    if muscle_group:
        query["muscle_groups"] = muscle_group
    if difficulty:
        query["difficulty"] = difficulty
    if is_rehabilitation is not None:
        query["is_rehabilitation"] = is_rehabilitation
    
    exercises = await db.exercises.find(query, {"_id": 0}).to_list(500)
    return exercises

@api_router.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    exercise = await db.exercises.find_one({"id": exercise_id}, {"_id": 0})
    if not exercise:
        raise HTTPException(status_code=404, detail="Übung nicht gefunden")
    return exercise

@api_router.get("/exercises/categories/list")
async def get_categories():
    return {
        "categories": [
            {"id": "strength", "name": "Krafttraining", "icon": "dumbbell"},
            {"id": "cardio", "name": "Ausdauer", "icon": "heart-pulse"},
            {"id": "flexibility", "name": "Dehnung & Mobilität", "icon": "accessibility"},
            {"id": "bodyweight", "name": "Körpergewicht", "icon": "body"},
            {"id": "rehabilitation", "name": "Rehabilitation", "icon": "medical-bag"}
        ],
        "muscle_groups": [
            "Brust", "Rücken", "Schultern", "Bizeps", "Trizeps", 
            "Bauch", "Beine", "Waden", "Gesäß", "Unterarme", "Ganzkörper"
        ],
        "difficulty_levels": [
            {"id": "beginner", "name": "Anfänger"},
            {"id": "intermediate", "name": "Fortgeschritten"},
            {"id": "advanced", "name": "Profi"}
        ]
    }

# ============== TRAINING PLANS ROUTES ==============

@api_router.get("/plans")
async def get_plans(user: dict = Depends(get_current_user)):
    plans = await db.training_plans.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return plans

@api_router.post("/plans")
async def create_plan(plan: TrainingPlan, user: dict = Depends(get_current_user)):
    plan_data = plan.model_dump()
    plan_data["user_id"] = user["id"]
    plan_data["id"] = str(uuid.uuid4())
    plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.training_plans.insert_one(plan_data)
    return plan_data

@api_router.get("/plans/{plan_id}")
async def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    plan = await db.training_plans.find_one({"id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Trainingsplan nicht gefunden")
    return plan

@api_router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, plan: TrainingPlan, user: dict = Depends(get_current_user)):
    existing = await db.training_plans.find_one({"id": plan_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Trainingsplan nicht gefunden")
    
    plan_data = plan.model_dump()
    plan_data["id"] = plan_id
    plan_data["user_id"] = user["id"]
    await db.training_plans.update_one({"id": plan_id}, {"$set": plan_data})
    return plan_data

@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, user: dict = Depends(get_current_user)):
    result = await db.training_plans.delete_one({"id": plan_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trainingsplan nicht gefunden")
    return {"message": "Trainingsplan gelöscht"}

# ============== AI TRAINING PLAN GENERATION ==============

async def generate_smart_plan(request: AITrainingPlanRequest, profile: dict, anamnesis: dict) -> dict:
    """Generate a training plan based on user profile and goals using smart rule-based logic"""
    
    # Get exercises from database
    exercises = await db.exercises.find({}, {"_id": 0}).to_list(500)
    
    # Filter exercises based on contraindications
    joint_problems = anamnesis.get('joint_problems', [])
    heart_conditions = anamnesis.get('heart_conditions', False)
    high_blood_pressure = anamnesis.get('high_blood_pressure', False)
    
    safe_exercises = []
    for ex in exercises:
        # Check contraindications
        contra = ex.get('contraindications', [])
        has_contra = any(jp in contra for jp in joint_problems)
        
        # Skip high intensity for heart conditions
        if heart_conditions and ex.get('category') == 'cardio' and ex.get('difficulty') == 'advanced':
            continue
        
        if not has_contra:
            safe_exercises.append(ex)
    
    # Filter by difficulty based on experience level
    experience_level = profile.get('experience_level', 'beginner')
    difficulty_map = {
        'beginner': ['beginner'],
        'intermediate': ['beginner', 'intermediate'],
        'advanced': ['beginner', 'intermediate', 'advanced']
    }
    allowed_difficulties = difficulty_map.get(experience_level, ['beginner', 'intermediate'])
    
    # Select exercises based on goal
    goal = request.goal
    selected = []
    
    # Goal-specific exercise selection
    if goal == 'weight_loss':
        # More cardio and bodyweight
        categories_priority = ['cardio', 'bodyweight', 'strength', 'flexibility']
    elif goal == 'muscle_gain':
        # Strength focused
        categories_priority = ['strength', 'bodyweight', 'flexibility']
    elif goal == 'mobility':
        # Flexibility focused
        categories_priority = ['flexibility', 'bodyweight', 'rehabilitation']
    elif goal == 'endurance':
        # Cardio focused
        categories_priority = ['cardio', 'bodyweight', 'strength']
    elif goal == 'rehabilitation':
        # Rehab and gentle exercises
        categories_priority = ['rehabilitation', 'flexibility', 'bodyweight']
    else:
        categories_priority = ['strength', 'bodyweight', 'cardio', 'flexibility']
    
    # Add rehabilitation exercises if user has joint problems
    if joint_problems:
        for ex in safe_exercises:
            if ex.get('is_rehabilitation') and ex.get('difficulty') in allowed_difficulties:
                if len(selected) < 3:
                    selected.append(ex)
    
    # Fill up to 8 exercises from priority categories
    for category in categories_priority:
        for ex in safe_exercises:
            if (ex.get('category') == category and 
                ex.get('difficulty') in allowed_difficulties and
                ex not in selected):
                selected.append(ex)
                if len(selected) >= 8:
                    break
        if len(selected) >= 8:
            break
    
    # Ensure we have at least 5 exercises
    if len(selected) < 5:
        for ex in safe_exercises:
            if ex not in selected and ex.get('difficulty') in allowed_difficulties:
                selected.append(ex)
                if len(selected) >= 6:
                    break
    
    # Create workout exercises with appropriate sets/reps
    workout_exercises = []
    for ex in selected:
        # Adjust based on goal
        if goal == 'muscle_gain':
            sets, reps = (4, 8) if experience_level != 'beginner' else (3, 10)
        elif goal == 'endurance':
            sets, reps = (3, 15)
        elif goal == 'rehabilitation':
            sets, reps = (2, 12)
        else:
            sets, reps = (3, 10)
        
        workout_exercises.append({
            "exercise_id": ex['id'],
            "sets": sets,
            "reps": reps,
            "rest_seconds": 60 if goal != 'muscle_gain' else 90,
            "notes": f"Achte auf korrekte Ausführung"
        })
    
    # Generate plan name
    goal_names = {
        'weight_loss': 'Fettverbrennung',
        'muscle_gain': 'Muskelaufbau',
        'mobility': 'Mobilität',
        'endurance': 'Ausdauer',
        'rehabilitation': 'Rehabilitation'
    }
    
    return {
        "name": f"Personalisierter {goal_names.get(goal, 'Fitness')}-Plan",
        "description": f"Maßgeschneiderter Plan für {goal_names.get(goal, 'Fitness')} basierend auf deinem Profil und gesundheitlichen Einschränkungen.",
        "exercises": workout_exercises
    }

@api_router.post("/plans/generate")
async def generate_ai_plan(request: AITrainingPlanRequest, user: dict = Depends(get_current_user)):
    try:
        profile = user.get("profile", {})
        anamnesis = user.get("anamnesis", {})
        
        # Try AI generation first, fallback to smart rules
        plan_data = None
        
        try:
            # Get available exercises
            exercises = await db.exercises.find({}, {"_id": 0}).to_list(500)
            exercise_names = [f"{e['name_de']} (ID: {e['id']}, Kategorie: {e['category']}, Muskelgruppen: {', '.join(e['muscle_groups'])}, Schwierigkeit: {e['difficulty']})" for e in exercises[:50]]
            
            # Build context about user
            user_context = f"""
Benutzerprofil:
- Gewicht: {profile.get('weight', 'unbekannt')} kg
- Größe: {profile.get('height', 'unbekannt')} cm
- BMI: {profile.get('bmi', 'unbekannt')}
- Alter: {profile.get('age', 'unbekannt')}
- Geschlecht: {profile.get('gender', 'unbekannt')}
- Fitnessziel: {profile.get('fitness_goal', request.goal)}
- Erfahrungslevel: {profile.get('experience_level', 'beginner')}

Gesundheitliche Anamnese:
- Herzprobleme: {'Ja' if anamnesis.get('heart_conditions') else 'Nein'}
- Bluthochdruck: {'Ja' if anamnesis.get('high_blood_pressure') else 'Nein'}
- Diabetes: {'Ja' if anamnesis.get('diabetes') else 'Nein'}
- Gelenkprobleme: {', '.join(anamnesis.get('joint_problems', [])) or 'Keine'}
- Andere Einschränkungen: {anamnesis.get('physical_limitations', 'Keine')}

Trainingsplan-Anforderung:
- Ziel: {request.goal}
- Trainingstage pro Woche: {request.days_per_week}
- Dauer: {request.duration_weeks} Wochen
- Fokus-Bereiche: {', '.join(request.focus_areas) if request.focus_areas else 'Allgemein'}
"""
            
            prompt = f"""Du bist ein professioneller Fitness-Trainer. Erstelle einen personalisierten Trainingsplan:

{user_context}

Verfügbare Übungen (verwende NUR diese IDs):
{chr(10).join(exercise_names)}

WICHTIG: Berücksichtige alle gesundheitlichen Einschränkungen. Bei Gelenkproblemen vermeide belastende Übungen.

Antworte NUR mit JSON:
{{"name": "Planname", "description": "Beschreibung", "exercises": [{{"exercise_id": "ID", "sets": 3, "reps": 10, "rest_seconds": 60, "notes": ""}}]}}"""

            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Du bist ein Fitness-Experte. Antworte NUR mit validem JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()
            
            import json
            plan_data = json.loads(content)
            logger.info("AI plan generated successfully")
            
        except Exception as ai_error:
            logger.warning(f"AI generation failed, using smart fallback: {str(ai_error)}")
            # Fallback to smart rule-based generation
            plan_data = await generate_smart_plan(request, profile, anamnesis)
        
        # Create the plan
        plan_id = str(uuid.uuid4())
        final_plan = {
            "id": plan_id,
            "user_id": user["id"],
            "name": plan_data.get("name", f"Trainingsplan - {request.goal}"),
            "description": plan_data.get("description", ""),
            "goal": request.goal,
            "exercises": plan_data.get("exercises", []),
            "days_per_week": request.days_per_week,
            "duration_weeks": request.duration_weeks,
            "is_ai_generated": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.training_plans.insert_one(final_plan)
        # Remove _id before returning
        final_plan.pop('_id', None)
        return final_plan
        
    except Exception as e:
        logger.error(f"AI Plan generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der Plan-Generierung: {str(e)}")

# ============== WORKOUT LOGGING ==============

@api_router.post("/workouts")
async def log_workout(workout: WorkoutLog, user: dict = Depends(get_current_user)):
    workout_data = workout.model_dump()
    workout_data["id"] = str(uuid.uuid4())
    workout_data["user_id"] = user["id"]
    workout_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.workout_logs.insert_one(workout_data)
    return workout_data

@api_router.get("/workouts")
async def get_workouts(
    user: dict = Depends(get_current_user),
    limit: int = 50,
    skip: int = 0
):
    workouts = await db.workout_logs.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return workouts

@api_router.get("/workouts/stats")
async def get_workout_stats(user: dict = Depends(get_current_user)):
    # Get all workouts
    workouts = await db.workout_logs.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    if not workouts:
        return {
            "total_workouts": 0,
            "total_duration_minutes": 0,
            "workouts_this_week": 0,
            "workouts_this_month": 0,
            "streak_days": 0,
            "progress_data": []
        }
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    total_duration = sum(w.get("duration_minutes", 0) for w in workouts)
    
    workouts_this_week = len([w for w in workouts if w.get("date", "") >= week_ago.strftime("%Y-%m-%d")])
    workouts_this_month = len([w for w in workouts if w.get("date", "") >= month_ago.strftime("%Y-%m-%d")])
    
    # Calculate streak
    dates = sorted(set(w.get("date", "")[:10] for w in workouts), reverse=True)
    streak = 0
    today = now.strftime("%Y-%m-%d")
    for i, date in enumerate(dates):
        expected = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        if date == expected:
            streak += 1
        else:
            break
    
    # Progress data (last 30 days)
    progress_data = []
    for i in range(30):
        date = (now - timedelta(days=29-i)).strftime("%Y-%m-%d")
        day_workouts = [w for w in workouts if w.get("date", "").startswith(date)]
        progress_data.append({
            "date": date,
            "workouts": len(day_workouts),
            "duration": sum(w.get("duration_minutes", 0) for w in day_workouts)
        })
    
    return {
        "total_workouts": len(workouts),
        "total_duration_minutes": total_duration,
        "workouts_this_week": workouts_this_week,
        "workouts_this_month": workouts_this_month,
        "streak_days": streak,
        "progress_data": progress_data
    }

# ============== EXERCISE PROGRESS TRACKING ==============

@api_router.get("/progress/exercise/{exercise_id}")
async def get_exercise_progress(exercise_id: str, user: dict = Depends(get_current_user)):
    workouts = await db.workout_logs.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    progress = []
    for workout in workouts:
        for ex in workout.get("exercises", []):
            if ex.get("exercise_id") == exercise_id:
                progress.append({
                    "date": workout.get("date"),
                    "weight": ex.get("weight_used"),
                    "sets": ex.get("sets_completed"),
                    "reps": ex.get("reps_completed")
                })
    
    progress.sort(key=lambda x: x["date"])
    return progress

# ============== SEED EXERCISES ==============

@api_router.post("/admin/seed-exercises")
async def seed_exercises():
    """Seed the database with comprehensive exercise data"""
    
    exercises = [
        # STRENGTH - CHEST
        {
            "id": "bench-press",
            "name": "Bench Press",
            "name_de": "Bankdrücken",
            "category": "strength",
            "muscle_groups": ["Brust", "Trizeps", "Schultern"],
            "equipment": "Langhantel, Flachbank",
            "difficulty": "intermediate",
            "description": "Classic chest exercise for building upper body strength",
            "description_de": "Klassische Brustübung für den Aufbau von Oberkörperkraft",
            "instructions": ["Lie on bench", "Grip bar slightly wider than shoulders", "Lower to chest", "Press up"],
            "instructions_de": ["Auf Bank legen", "Stange etwas breiter als schulterbreit greifen", "Zur Brust absenken", "Nach oben drücken"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 8
        },
        {
            "id": "incline-bench-press",
            "name": "Incline Bench Press",
            "name_de": "Schrägbankdrücken",
            "category": "strength",
            "muscle_groups": ["Brust", "Schultern", "Trizeps"],
            "equipment": "Langhantel, Schrägbank",
            "difficulty": "intermediate",
            "description": "Targets upper chest muscles",
            "description_de": "Zielt auf die obere Brustmuskulatur",
            "instructions": ["Set bench to 30-45 degrees", "Grip bar", "Lower to upper chest", "Press up"],
            "instructions_de": ["Bank auf 30-45 Grad einstellen", "Stange greifen", "Zur oberen Brust absenken", "Nach oben drücken"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 8
        },
        {
            "id": "dumbbell-flyes",
            "name": "Dumbbell Flyes",
            "name_de": "Kurzhantel-Fliegende",
            "category": "strength",
            "muscle_groups": ["Brust"],
            "equipment": "Kurzhanteln, Flachbank",
            "difficulty": "intermediate",
            "description": "Isolation exercise for chest",
            "description_de": "Isolationsübung für die Brust",
            "instructions": ["Lie on bench with dumbbells", "Arms slightly bent", "Lower to sides", "Squeeze back up"],
            "instructions_de": ["Mit Kurzhanteln auf Bank legen", "Arme leicht gebeugt", "Zu den Seiten absenken", "Zusammendrücken"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 6
        },
        {
            "id": "cable-crossover",
            "name": "Cable Crossover",
            "name_de": "Kabelzug-Crossover",
            "category": "strength",
            "muscle_groups": ["Brust"],
            "equipment": "Kabelzug",
            "difficulty": "intermediate",
            "description": "Cable exercise for chest definition",
            "description_de": "Kabelübung für Brustdefinition",
            "instructions": ["Stand between cables", "Grip handles", "Bring arms together in front", "Control return"],
            "instructions_de": ["Zwischen Kabelzügen stehen", "Griffe fassen", "Arme vor dem Körper zusammenführen", "Kontrolliert zurück"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 5
        },
        
        # STRENGTH - BACK
        {
            "id": "lat-pulldown",
            "name": "Lat Pulldown",
            "name_de": "Latzug",
            "category": "strength",
            "muscle_groups": ["Rücken", "Bizeps"],
            "equipment": "Latzugmaschine",
            "difficulty": "beginner",
            "description": "Machine exercise for back width",
            "description_de": "Maschinenübung für Rückenbreite",
            "instructions": ["Sit at machine", "Grip bar wide", "Pull to chest", "Slowly release"],
            "instructions_de": ["An Maschine setzen", "Stange breit greifen", "Zur Brust ziehen", "Langsam zurück"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 6
        },
        {
            "id": "barbell-row",
            "name": "Barbell Row",
            "name_de": "Langhantel-Rudern",
            "category": "strength",
            "muscle_groups": ["Rücken", "Bizeps"],
            "equipment": "Langhantel",
            "difficulty": "intermediate",
            "description": "Compound back exercise",
            "description_de": "Komplexe Rückenübung",
            "instructions": ["Bend at hips", "Grip bar", "Row to lower chest", "Lower controlled"],
            "instructions_de": ["In der Hüfte beugen", "Stange greifen", "Zur unteren Brust rudern", "Kontrolliert absenken"],
            "contraindications": ["back"],
            "is_rehabilitation": False,
            "calories_per_minute": 7
        },
        {
            "id": "seated-cable-row",
            "name": "Seated Cable Row",
            "name_de": "Sitzendes Kabelrudern",
            "category": "strength",
            "muscle_groups": ["Rücken", "Bizeps"],
            "equipment": "Kabelzug",
            "difficulty": "beginner",
            "description": "Seated rowing exercise",
            "description_de": "Sitzende Ruderübung",
            "instructions": ["Sit at cable machine", "Grip handle", "Pull to abdomen", "Extend arms"],
            "instructions_de": ["Am Kabelzug sitzen", "Griff fassen", "Zum Bauch ziehen", "Arme strecken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 5
        },
        {
            "id": "deadlift",
            "name": "Deadlift",
            "name_de": "Kreuzheben",
            "category": "strength",
            "muscle_groups": ["Rücken", "Beine", "Gesäß"],
            "equipment": "Langhantel",
            "difficulty": "advanced",
            "description": "Full body compound lift",
            "description_de": "Ganzkörper-Verbundübung",
            "instructions": ["Stand with feet hip-width", "Grip bar", "Lift by extending hips and knees", "Lower controlled"],
            "instructions_de": ["Füße hüftbreit", "Stange greifen", "Durch Hüft- und Kniestreckung heben", "Kontrolliert absenken"],
            "contraindications": ["back", "knee"],
            "is_rehabilitation": False,
            "calories_per_minute": 10
        },
        
        # STRENGTH - SHOULDERS
        {
            "id": "overhead-press",
            "name": "Overhead Press",
            "name_de": "Schulterdrücken",
            "category": "strength",
            "muscle_groups": ["Schultern", "Trizeps"],
            "equipment": "Langhantel",
            "difficulty": "intermediate",
            "description": "Standing shoulder press",
            "description_de": "Stehendes Schulterdrücken",
            "instructions": ["Stand with bar at shoulders", "Press overhead", "Lock out arms", "Lower to shoulders"],
            "instructions_de": ["Mit Stange an Schultern stehen", "Über Kopf drücken", "Arme strecken", "Zu Schultern senken"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 7
        },
        {
            "id": "lateral-raises",
            "name": "Lateral Raises",
            "name_de": "Seitheben",
            "category": "strength",
            "muscle_groups": ["Schultern"],
            "equipment": "Kurzhanteln",
            "difficulty": "beginner",
            "description": "Isolation exercise for side delts",
            "description_de": "Isolationsübung für seitliche Schultern",
            "instructions": ["Stand with dumbbells", "Raise to sides", "Stop at shoulder height", "Lower slowly"],
            "instructions_de": ["Mit Kurzhanteln stehen", "Zu den Seiten heben", "Auf Schulterhöhe stoppen", "Langsam senken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 4
        },
        {
            "id": "face-pulls",
            "name": "Face Pulls",
            "name_de": "Face Pulls",
            "category": "strength",
            "muscle_groups": ["Schultern", "Rücken"],
            "equipment": "Kabelzug",
            "difficulty": "beginner",
            "description": "Rear delt and rotator cuff exercise",
            "description_de": "Übung für hintere Schulter und Rotatorenmanschette",
            "instructions": ["Set cable at face height", "Pull rope to face", "Squeeze shoulder blades", "Return controlled"],
            "instructions_de": ["Kabel auf Gesichtshöhe", "Seil zum Gesicht ziehen", "Schulterblätter zusammen", "Kontrolliert zurück"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 4
        },
        
        # STRENGTH - ARMS
        {
            "id": "bicep-curls",
            "name": "Bicep Curls",
            "name_de": "Bizeps-Curls",
            "category": "strength",
            "muscle_groups": ["Bizeps"],
            "equipment": "Kurzhanteln",
            "difficulty": "beginner",
            "description": "Basic bicep exercise",
            "description_de": "Grundlegende Bizepsübung",
            "instructions": ["Stand with dumbbells", "Curl up", "Squeeze at top", "Lower controlled"],
            "instructions_de": ["Mit Kurzhanteln stehen", "Nach oben curlen", "Oben anspannen", "Kontrolliert senken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 4
        },
        {
            "id": "tricep-pushdown",
            "name": "Tricep Pushdown",
            "name_de": "Trizeps-Pushdown",
            "category": "strength",
            "muscle_groups": ["Trizeps"],
            "equipment": "Kabelzug",
            "difficulty": "beginner",
            "description": "Cable exercise for triceps",
            "description_de": "Kabelübung für Trizeps",
            "instructions": ["Stand at cable", "Grip bar or rope", "Push down", "Extend fully"],
            "instructions_de": ["Am Kabel stehen", "Stange oder Seil greifen", "Nach unten drücken", "Vollständig strecken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 4
        },
        {
            "id": "hammer-curls",
            "name": "Hammer Curls",
            "name_de": "Hammer-Curls",
            "category": "strength",
            "muscle_groups": ["Bizeps", "Unterarme"],
            "equipment": "Kurzhanteln",
            "difficulty": "beginner",
            "description": "Neutral grip bicep curl",
            "description_de": "Bizeps-Curl mit neutralem Griff",
            "instructions": ["Hold dumbbells with neutral grip", "Curl up", "Keep wrists straight", "Lower controlled"],
            "instructions_de": ["Kurzhanteln mit neutralem Griff halten", "Nach oben curlen", "Handgelenke gerade", "Kontrolliert senken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 4
        },
        
        # STRENGTH - LEGS
        {
            "id": "squats",
            "name": "Barbell Squats",
            "name_de": "Kniebeugen",
            "category": "strength",
            "muscle_groups": ["Beine", "Gesäß"],
            "equipment": "Langhantel, Squat-Rack",
            "difficulty": "intermediate",
            "description": "King of leg exercises",
            "description_de": "König der Beinübungen",
            "instructions": ["Bar on upper back", "Feet shoulder-width", "Squat down", "Push through heels"],
            "instructions_de": ["Stange auf oberem Rücken", "Füße schulterbreit", "In die Hocke gehen", "Durch die Fersen drücken"],
            "contraindications": ["knee", "back"],
            "is_rehabilitation": False,
            "calories_per_minute": 9
        },
        {
            "id": "leg-press",
            "name": "Leg Press",
            "name_de": "Beinpresse",
            "category": "strength",
            "muscle_groups": ["Beine", "Gesäß"],
            "equipment": "Beinpresse",
            "difficulty": "beginner",
            "description": "Machine leg exercise",
            "description_de": "Maschinelle Beinübung",
            "instructions": ["Sit in machine", "Feet on platform", "Lower weight", "Press up"],
            "instructions_de": ["In Maschine setzen", "Füße auf Plattform", "Gewicht absenken", "Nach oben drücken"],
            "contraindications": ["knee"],
            "is_rehabilitation": False,
            "calories_per_minute": 7
        },
        {
            "id": "leg-extension",
            "name": "Leg Extension",
            "name_de": "Beinstrecker",
            "category": "strength",
            "muscle_groups": ["Beine"],
            "equipment": "Beinstrecker-Maschine",
            "difficulty": "beginner",
            "description": "Quadriceps isolation",
            "description_de": "Quadrizeps-Isolation",
            "instructions": ["Sit in machine", "Extend legs", "Squeeze quads", "Lower controlled"],
            "instructions_de": ["In Maschine setzen", "Beine strecken", "Quadrizeps anspannen", "Kontrolliert senken"],
            "contraindications": ["knee"],
            "is_rehabilitation": False,
            "calories_per_minute": 5
        },
        {
            "id": "leg-curl",
            "name": "Leg Curl",
            "name_de": "Beincurl",
            "category": "strength",
            "muscle_groups": ["Beine"],
            "equipment": "Beincurl-Maschine",
            "difficulty": "beginner",
            "description": "Hamstring isolation",
            "description_de": "Beinbeuger-Isolation",
            "instructions": ["Lie on machine", "Curl heels to glutes", "Squeeze hamstrings", "Lower controlled"],
            "instructions_de": ["Auf Maschine legen", "Fersen zum Gesäß curlen", "Beinbeuger anspannen", "Kontrolliert senken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 5
        },
        {
            "id": "lunges",
            "name": "Lunges",
            "name_de": "Ausfallschritte",
            "category": "strength",
            "muscle_groups": ["Beine", "Gesäß"],
            "equipment": "Kurzhanteln (optional)",
            "difficulty": "beginner",
            "description": "Single leg exercise",
            "description_de": "Einbeinige Übung",
            "instructions": ["Step forward", "Lower back knee", "Push back up", "Alternate legs"],
            "instructions_de": ["Nach vorne treten", "Hinteres Knie senken", "Zurück drücken", "Beine wechseln"],
            "contraindications": ["knee"],
            "is_rehabilitation": False,
            "calories_per_minute": 6
        },
        {
            "id": "calf-raises",
            "name": "Calf Raises",
            "name_de": "Wadenheben",
            "category": "strength",
            "muscle_groups": ["Waden"],
            "equipment": "Langhantel oder Maschine",
            "difficulty": "beginner",
            "description": "Calf exercise",
            "description_de": "Wadenübung",
            "instructions": ["Stand on edge", "Rise on toes", "Squeeze calves", "Lower controlled"],
            "instructions_de": ["Auf Kante stehen", "Auf Zehenspitzen heben", "Waden anspannen", "Kontrolliert senken"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 4
        },
        
        # STRENGTH - CORE
        {
            "id": "cable-crunches",
            "name": "Cable Crunches",
            "name_de": "Kabel-Crunches",
            "category": "strength",
            "muscle_groups": ["Bauch"],
            "equipment": "Kabelzug",
            "difficulty": "intermediate",
            "description": "Weighted ab exercise",
            "description_de": "Gewichtete Bauchübung",
            "instructions": ["Kneel at cable", "Hold rope behind head", "Crunch down", "Return controlled"],
            "instructions_de": ["Am Kabel knien", "Seil hinter Kopf halten", "Nach unten crunchen", "Kontrolliert zurück"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 5
        },
        
        # BODYWEIGHT
        {
            "id": "pushups",
            "name": "Push-Ups",
            "name_de": "Liegestütze",
            "category": "bodyweight",
            "muscle_groups": ["Brust", "Trizeps", "Schultern"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Classic bodyweight exercise",
            "description_de": "Klassische Körpergewichtsübung",
            "instructions": ["Plank position", "Lower chest to floor", "Push up", "Keep core tight"],
            "instructions_de": ["Plank-Position", "Brust zum Boden senken", "Nach oben drücken", "Rumpf anspannen"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 7
        },
        {
            "id": "pullups",
            "name": "Pull-Ups",
            "name_de": "Klimmzüge",
            "category": "bodyweight",
            "muscle_groups": ["Rücken", "Bizeps"],
            "equipment": "Klimmzugstange",
            "difficulty": "intermediate",
            "description": "Upper body pulling exercise",
            "description_de": "Oberkörper-Zugübung",
            "instructions": ["Grip bar overhand", "Pull chin over bar", "Lower controlled", "Full extension"],
            "instructions_de": ["Stange im Obergriff", "Kinn über Stange", "Kontrolliert senken", "Volle Streckung"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 8
        },
        {
            "id": "dips",
            "name": "Dips",
            "name_de": "Dips",
            "category": "bodyweight",
            "muscle_groups": ["Brust", "Trizeps", "Schultern"],
            "equipment": "Dipstation",
            "difficulty": "intermediate",
            "description": "Tricep and chest exercise",
            "description_de": "Trizeps- und Brustübung",
            "instructions": ["Grip bars", "Lower body", "Elbows back", "Push up"],
            "instructions_de": ["Stangen greifen", "Körper senken", "Ellbogen nach hinten", "Nach oben drücken"],
            "contraindications": ["shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 7
        },
        {
            "id": "plank",
            "name": "Plank",
            "name_de": "Plank",
            "category": "bodyweight",
            "muscle_groups": ["Bauch", "Rücken"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Core stability exercise",
            "description_de": "Rumpfstabilitätsübung",
            "instructions": ["Forearms on floor", "Body straight", "Hold position", "Breathe steadily"],
            "instructions_de": ["Unterarme auf Boden", "Körper gerade", "Position halten", "Gleichmäßig atmen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 4
        },
        {
            "id": "mountain-climbers",
            "name": "Mountain Climbers",
            "name_de": "Mountain Climbers",
            "category": "bodyweight",
            "muscle_groups": ["Bauch", "Beine", "Ganzkörper"],
            "equipment": None,
            "difficulty": "intermediate",
            "description": "Cardio and core exercise",
            "description_de": "Cardio- und Rumpfübung",
            "instructions": ["Plank position", "Drive knees to chest", "Alternate quickly", "Keep hips low"],
            "instructions_de": ["Plank-Position", "Knie zur Brust", "Schnell wechseln", "Hüfte tief halten"],
            "contraindications": [],
            "is_rehabilitation": False,
            "calories_per_minute": 10
        },
        {
            "id": "burpees",
            "name": "Burpees",
            "name_de": "Burpees",
            "category": "bodyweight",
            "muscle_groups": ["Ganzkörper"],
            "equipment": None,
            "difficulty": "intermediate",
            "description": "Full body cardio exercise",
            "description_de": "Ganzkörper-Cardio-Übung",
            "instructions": ["Squat down", "Jump feet back", "Push-up", "Jump up"],
            "instructions_de": ["In Hocke gehen", "Füße nach hinten springen", "Liegestütz", "Nach oben springen"],
            "contraindications": ["knee", "back", "shoulder"],
            "is_rehabilitation": False,
            "calories_per_minute": 12
        },
        {
            "id": "bodyweight-squats",
            "name": "Bodyweight Squats",
            "name_de": "Kniebeugen ohne Gewicht",
            "category": "bodyweight",
            "muscle_groups": ["Beine", "Gesäß"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Basic squat movement",
            "description_de": "Grundlegende Kniebeugebewegung",
            "instructions": ["Feet shoulder-width", "Squat down", "Knees over toes", "Stand up"],
            "instructions_de": ["Füße schulterbreit", "In die Hocke", "Knie über Zehen", "Aufstehen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 6
        },
        
        # CARDIO
        {
            "id": "treadmill-run",
            "name": "Treadmill Running",
            "name_de": "Laufband",
            "category": "cardio",
            "muscle_groups": ["Beine", "Ganzkörper"],
            "equipment": "Laufband",
            "difficulty": "beginner",
            "description": "Cardiovascular exercise",
            "description_de": "Herz-Kreislauf-Training",
            "instructions": ["Set speed", "Run at steady pace", "Maintain form", "Cool down"],
            "instructions_de": ["Geschwindigkeit einstellen", "Gleichmäßig laufen", "Form beibehalten", "Abkühlen"],
            "contraindications": ["knee", "ankle"],
            "is_rehabilitation": False,
            "calories_per_minute": 11
        },
        {
            "id": "cycling",
            "name": "Stationary Cycling",
            "name_de": "Fahrrad-Ergometer",
            "category": "cardio",
            "muscle_groups": ["Beine"],
            "equipment": "Fahrrad-Ergometer",
            "difficulty": "beginner",
            "description": "Low-impact cardio",
            "description_de": "Gelenkschonendes Cardio",
            "instructions": ["Adjust seat height", "Pedal at steady pace", "Vary resistance", "Maintain posture"],
            "instructions_de": ["Sitzhöhe anpassen", "Gleichmäßig treten", "Widerstand variieren", "Haltung bewahren"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 8
        },
        {
            "id": "rowing-machine",
            "name": "Rowing Machine",
            "name_de": "Rudergerät",
            "category": "cardio",
            "muscle_groups": ["Rücken", "Beine", "Ganzkörper"],
            "equipment": "Rudergerät",
            "difficulty": "beginner",
            "description": "Full body cardio",
            "description_de": "Ganzkörper-Cardio",
            "instructions": ["Sit on machine", "Push with legs", "Pull with arms", "Return controlled"],
            "instructions_de": ["Auf Gerät setzen", "Mit Beinen drücken", "Mit Armen ziehen", "Kontrolliert zurück"],
            "contraindications": ["back"],
            "is_rehabilitation": False,
            "calories_per_minute": 9
        },
        {
            "id": "elliptical",
            "name": "Elliptical Trainer",
            "name_de": "Crosstrainer",
            "category": "cardio",
            "muscle_groups": ["Beine", "Ganzkörper"],
            "equipment": "Crosstrainer",
            "difficulty": "beginner",
            "description": "Low-impact full body cardio",
            "description_de": "Gelenkschonendes Ganzkörper-Cardio",
            "instructions": ["Step on machine", "Hold handles", "Move in elliptical motion", "Vary resistance"],
            "instructions_de": ["Auf Gerät steigen", "Griffe halten", "Elliptische Bewegung", "Widerstand variieren"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 7
        },
        {
            "id": "jumping-jacks",
            "name": "Jumping Jacks",
            "name_de": "Hampelmänner",
            "category": "cardio",
            "muscle_groups": ["Ganzkörper"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Classic cardio exercise",
            "description_de": "Klassische Cardio-Übung",
            "instructions": ["Stand straight", "Jump feet out", "Raise arms", "Return to start"],
            "instructions_de": ["Gerade stehen", "Füße auseinander springen", "Arme heben", "Zurück zur Ausgangsposition"],
            "contraindications": ["knee", "ankle"],
            "is_rehabilitation": False,
            "calories_per_minute": 8
        },
        
        # FLEXIBILITY / STRETCHING
        {
            "id": "hamstring-stretch",
            "name": "Hamstring Stretch",
            "name_de": "Beinbeuger-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Stretches back of legs",
            "description_de": "Dehnt die Beinrückseite",
            "instructions": ["Sit on floor", "Extend one leg", "Reach for toes", "Hold 30 seconds"],
            "instructions_de": ["Auf Boden setzen", "Ein Bein strecken", "Zu Zehen greifen", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "quad-stretch",
            "name": "Quadriceps Stretch",
            "name_de": "Quadrizeps-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Stretches front of thigh",
            "description_de": "Dehnt die Oberschenkelvorderseite",
            "instructions": ["Stand on one leg", "Pull heel to glute", "Keep knees together", "Hold 30 seconds"],
            "instructions_de": ["Auf einem Bein stehen", "Ferse zum Gesäß", "Knie zusammen", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "hip-flexor-stretch",
            "name": "Hip Flexor Stretch",
            "name_de": "Hüftbeuger-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Beine", "Gesäß"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Opens hip flexors",
            "description_de": "Öffnet die Hüftbeuger",
            "instructions": ["Lunge position", "Back knee down", "Push hips forward", "Hold 30 seconds"],
            "instructions_de": ["Ausfallschritt-Position", "Hinteres Knie unten", "Hüfte nach vorne", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "chest-stretch",
            "name": "Chest Stretch",
            "name_de": "Brust-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Brust"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Opens chest and shoulders",
            "description_de": "Öffnet Brust und Schultern",
            "instructions": ["Stand in doorway", "Arms on frame", "Lean forward", "Hold 30 seconds"],
            "instructions_de": ["Im Türrahmen stehen", "Arme am Rahmen", "Nach vorne lehnen", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "shoulder-stretch",
            "name": "Shoulder Stretch",
            "name_de": "Schulter-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Schultern"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Stretches shoulder muscles",
            "description_de": "Dehnt die Schultermuskulatur",
            "instructions": ["Cross arm over chest", "Pull with other arm", "Keep shoulders down", "Hold 30 seconds"],
            "instructions_de": ["Arm vor Brust kreuzen", "Mit anderem Arm ziehen", "Schultern unten", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "cat-cow-stretch",
            "name": "Cat-Cow Stretch",
            "name_de": "Katze-Kuh-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Rücken"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Spinal mobility exercise",
            "description_de": "Wirbelsäulen-Mobilisation",
            "instructions": ["On all fours", "Arch back up (cat)", "Drop belly down (cow)", "Repeat slowly"],
            "instructions_de": ["Auf allen Vieren", "Rücken nach oben wölben (Katze)", "Bauch nach unten (Kuh)", "Langsam wiederholen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "child-pose",
            "name": "Child's Pose",
            "name_de": "Kind-Position",
            "category": "flexibility",
            "muscle_groups": ["Rücken", "Schultern"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Relaxation and back stretch",
            "description_de": "Entspannung und Rückendehnung",
            "instructions": ["Kneel on floor", "Sit back on heels", "Reach arms forward", "Rest forehead on floor"],
            "instructions_de": ["Auf Boden knien", "Auf Fersen setzen", "Arme nach vorne", "Stirn auf Boden"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "piriformis-stretch",
            "name": "Piriformis Stretch",
            "name_de": "Piriformis-Dehnung",
            "category": "flexibility",
            "muscle_groups": ["Gesäß"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Deep glute stretch",
            "description_de": "Tiefe Gesäß-Dehnung",
            "instructions": ["Lie on back", "Cross ankle over knee", "Pull thigh toward chest", "Hold 30 seconds"],
            "instructions_de": ["Auf Rücken liegen", "Knöchel über Knie", "Oberschenkel zur Brust", "30 Sekunden halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        
        # REHABILITATION
        {
            "id": "knee-circles",
            "name": "Knee Circles",
            "name_de": "Knie-Kreise",
            "category": "rehabilitation",
            "muscle_groups": ["Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Gentle knee mobility",
            "description_de": "Sanfte Knie-Mobilisation",
            "instructions": ["Stand with feet together", "Hands on knees", "Circle knees slowly", "Both directions"],
            "instructions_de": ["Füße zusammen stehen", "Hände auf Knie", "Knie langsam kreisen", "Beide Richtungen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "ankle-circles",
            "name": "Ankle Circles",
            "name_de": "Fußgelenk-Kreise",
            "category": "rehabilitation",
            "muscle_groups": ["Waden"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Ankle mobility exercise",
            "description_de": "Fußgelenk-Mobilisation",
            "instructions": ["Sit or stand on one leg", "Rotate ankle", "Full circles", "Both directions"],
            "instructions_de": ["Sitzen oder auf einem Bein stehen", "Fußgelenk rotieren", "Volle Kreise", "Beide Richtungen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 1
        },
        {
            "id": "wall-slides",
            "name": "Wall Slides",
            "name_de": "Wand-Gleiten",
            "category": "rehabilitation",
            "muscle_groups": ["Schultern", "Rücken"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Shoulder mobility and posture",
            "description_de": "Schulter-Mobilität und Haltung",
            "instructions": ["Back against wall", "Arms in W position", "Slide up to Y", "Lower back down"],
            "instructions_de": ["Rücken an Wand", "Arme in W-Position", "Nach oben zu Y gleiten", "Wieder runter"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "glute-bridge",
            "name": "Glute Bridge",
            "name_de": "Glute Bridge",
            "category": "rehabilitation",
            "muscle_groups": ["Gesäß", "Rücken"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Hip and glute strengthening",
            "description_de": "Hüft- und Gesäß-Kräftigung",
            "instructions": ["Lie on back", "Feet flat, knees bent", "Lift hips up", "Squeeze glutes at top"],
            "instructions_de": ["Auf Rücken liegen", "Füße flach, Knie gebeugt", "Hüfte heben", "Gesäß oben anspannen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 4
        },
        {
            "id": "bird-dog",
            "name": "Bird Dog",
            "name_de": "Vogel-Hund",
            "category": "rehabilitation",
            "muscle_groups": ["Rücken", "Bauch"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Core stability exercise",
            "description_de": "Rumpfstabilitätsübung",
            "instructions": ["On all fours", "Extend opposite arm and leg", "Hold briefly", "Return and switch"],
            "instructions_de": ["Auf allen Vieren", "Gegenüberliegenden Arm und Bein strecken", "Kurz halten", "Zurück und wechseln"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 3
        },
        {
            "id": "dead-bug",
            "name": "Dead Bug",
            "name_de": "Toter Käfer",
            "category": "rehabilitation",
            "muscle_groups": ["Bauch", "Rücken"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Core stability without back strain",
            "description_de": "Rumpfstabilität ohne Rückenbelastung",
            "instructions": ["Lie on back", "Arms up, knees 90 degrees", "Lower opposite arm/leg", "Keep back flat"],
            "instructions_de": ["Auf Rücken liegen", "Arme hoch, Knie 90 Grad", "Gegenüberliegenden Arm/Bein senken", "Rücken flach halten"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 3
        },
        {
            "id": "clamshells",
            "name": "Clamshells",
            "name_de": "Muscheln",
            "category": "rehabilitation",
            "muscle_groups": ["Gesäß"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Hip abductor strengthening",
            "description_de": "Hüftabduktoren-Kräftigung",
            "instructions": ["Lie on side", "Knees bent, feet together", "Open top knee", "Keep feet together"],
            "instructions_de": ["Auf Seite liegen", "Knie gebeugt, Füße zusammen", "Oberes Knie öffnen", "Füße zusammen lassen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 3
        },
        {
            "id": "single-leg-balance",
            "name": "Single Leg Balance",
            "name_de": "Einbein-Stand",
            "category": "rehabilitation",
            "muscle_groups": ["Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Balance and stability training",
            "description_de": "Balance- und Stabilitätstraining",
            "instructions": ["Stand on one foot", "Hold position", "Keep hips level", "Progress by closing eyes"],
            "instructions_de": ["Auf einem Fuß stehen", "Position halten", "Hüfte gerade", "Fortschritt: Augen schließen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "seated-knee-extension",
            "name": "Seated Knee Extension",
            "name_de": "Sitzendes Kniestrecken",
            "category": "rehabilitation",
            "muscle_groups": ["Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Gentle quad activation",
            "description_de": "Sanfte Quadrizeps-Aktivierung",
            "instructions": ["Sit on chair", "Straighten one leg", "Hold briefly", "Lower controlled"],
            "instructions_de": ["Auf Stuhl sitzen", "Ein Bein strecken", "Kurz halten", "Kontrolliert senken"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        },
        {
            "id": "standing-hip-circles",
            "name": "Standing Hip Circles",
            "name_de": "Stehende Hüftkreise",
            "category": "rehabilitation",
            "muscle_groups": ["Gesäß", "Beine"],
            "equipment": None,
            "difficulty": "beginner",
            "description": "Hip mobility exercise",
            "description_de": "Hüft-Mobilitätsübung",
            "instructions": ["Stand on one leg", "Circle other leg", "Small controlled circles", "Both directions"],
            "instructions_de": ["Auf einem Bein stehen", "Anderes Bein kreisen", "Kleine kontrollierte Kreise", "Beide Richtungen"],
            "contraindications": [],
            "is_rehabilitation": True,
            "calories_per_minute": 2
        }
    ]
    
    # Clear existing and insert new
    await db.exercises.delete_many({})
    await db.exercises.insert_many(exercises)
    
    return {"message": f"{len(exercises)} Übungen erfolgreich eingefügt", "count": len(exercises)}

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and configure app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
