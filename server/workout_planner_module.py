"""
AI-Powered Workout Planner Module

This module generates personalized 7-day workout plans using:
- User profile (age, gender, weight, height, goal)
- Exercise database (2920+ exercises)
- Optional user preferences
- Hugging Face LLM (Gemma model)
"""

import pandas as pd
import requests
import json
import os

def load_exercises(equipment_filter=None, level_filter=None):
    """
    Load exercise database from CSV and optionally filter
    
    Args:
        equipment_filter: List of equipment types to include (e.g., ['Body Only', 'Dumbbell'])
        level_filter: List of levels to include (e.g., ['Beginner', 'Intermediate'])
    
    Returns:
        DataFrame with filtered exercises
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'exercises.csv')
    df = pd.read_csv(csv_path)
    
    # Clean column names
    df.columns = df.columns.str.strip()
    
    # Filter by equipment if specified
    if equipment_filter:
        df = df[df['Equipment'].isin(equipment_filter)]
    
    # Filter by level if specified
    if level_filter:
        df = df[df['Level'].isin(level_filter)]
    
    # Remove duplicates and keep only necessary columns
    df = df[['Title', 'Desc', 'Type', 'BodyPart', 'Equipment', 'Level']].drop_duplicates(subset=['Title'])
    
    return df


def build_prompt(age, gender, height_cm, weight_kg, target_weight_kg, weekly_goal_kg, goal_text, 
                 exercises_df, workout_preferences=None):
    """
    Build the LLM prompt for workout plan generation
    
    Args:
        age: User's age
        gender: User's gender
        height_cm: Height in cm
        weight_kg: Current weight in kg
        target_weight_kg: Target weight in kg
        weekly_goal_kg: Weekly weight change goal in kg
        goal_text: User's goal (e.g., "Reduce body fat", "Build muscle")
        exercises_df: DataFrame of available exercises
        workout_preferences: Optional user preferences string
    
    Returns:
        String prompt for the LLM
    """
    
    # Group exercises by body part for better organization
    exercises_by_bodypart = {}
    for bodypart in exercises_df['BodyPart'].unique():
        if pd.notna(bodypart):
            exercises_for_part = exercises_df[exercises_df['BodyPart'] == bodypart].head(30)  # Limit to 30 per body part
            exercises_by_bodypart[bodypart] = exercises_for_part.to_dict('records')
    
    # Build exercise database string
    exercise_db_str = "AVAILABLE EXERCISES DATABASE:\n\n"
    for bodypart, exercises in exercises_by_bodypart.items():
        exercise_db_str += f"=== {bodypart} ===\n"
        for ex in exercises[:15]:  # Limit to 15 per body part in prompt
            exercise_db_str += f"- {ex['Title']} (Equipment: {ex['Equipment']}, Level: {ex['Level']})\n"
        exercise_db_str += "\n"
    
    # Build preferences section
    preferences_section = ""
    if workout_preferences and workout_preferences.strip():
        preferences_section = f"""
USER PREFERENCES:
{workout_preferences}

CRITICAL INSTRUCTIONS FOR HANDLING ALL USER PREFERENCES:
You MUST carefully analyze the user preferences and respect ALL logical, safe requests. Read the preferences thoroughly and identify ANY of the following:

1. DAY-SPECIFIC PREFERENCES (MANDATORY - READ VERY CAREFULLY):
   ⚠️ CRITICAL: Only mark the EXACT days mentioned as rest days. Do NOT add extra days!
   
   HOW TO PARSE:
   - Read the preference word by word
   - Find day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
   - Mark ONLY those specific days as rest
   
   CONCRETE EXAMPLES - FOLLOW THESE EXACTLY:
   
   Example 1:
   Input: "I do not want to do workouts on monday and saturday"
   Days mentioned: Monday, Saturday
   Action: 
   - Monday → "focus": "Rest Day", "exercises": []
   - Saturday → "focus": "Rest Day", "exercises": []
   - Tuesday, Wednesday, Thursday, Friday, Sunday → CREATE WORKOUTS
   
   Example 2:
   Input: "no friday"
   Days mentioned: Friday
   Action:
   - Friday → "focus": "Rest Day", "exercises": []
   - Monday, Tuesday, Wednesday, Thursday, Saturday, Sunday → CREATE WORKOUTS
   
   Example 3:
   Input: "Create workout only for 4 days"
   Days mentioned: None specific, but wants only 4 workout days
   Action:
   - Choose best 4 days for workouts (e.g., Mon, Tue, Thu, Sat)
   - Other 3 days → "focus": "Rest Day", "exercises": []
   
   Example 4:
   Input: "no weekends"
   Days mentioned: Saturday, Sunday (weekends = Sat + Sun)
   Action:
   - Saturday → "focus": "Rest Day", "exercises": []
   - Sunday → "focus": "Rest Day", "exercises": []
   - Monday through Friday → CREATE WORKOUTS

2. INJURY & HEALTH RESTRICTIONS (MANDATORY):
   - Identify any injuries, pain, or health conditions mentioned
   - Phrases: "knee injury", "shoulder pain", "lower back problems", "can't do jumping", etc.
   - Action: EXCLUDE all exercises that stress the affected area
   - Examples:
     * "I have knee problems" → NO squats, lunges, jumping exercises, leg press
     * "Shoulder injury" → NO overhead press, shoulder raises, pull-ups
     * "Lower back pain" → NO deadlifts, bent-over rows, avoid heavy compound lifts

3. EQUIPMENT PREFERENCES (MANDATORY):
   - Identify available or unavailable equipment
   - Phrases: "bodyweight only", "I have dumbbells", "no gym access", "only resistance bands", etc.
   - Action: Use ONLY exercises with the specified equipment
   - Examples:
     * "Bodyweight only" → Equipment: "Body Only" exercises exclusively
     * "I have dumbbells and a bench" → Prioritize dumbbell and bench exercises
     * "No equipment" → Body weight exercises only

4. TIME & DURATION CONSTRAINTS (IMPORTANT):
   - Identify time limitations per workout
   - Phrases: "30 minutes max", "short workouts", "only have 20 minutes", "quick sessions", etc.
   - Action: Reduce number of exercises (3-4 exercises max) and sets (2-3 sets)
   - Examples:
     * "30 minute workouts" → 4-5 exercises, 3 sets each
     * "Only 20 minutes available" → 3-4 exercises, 2-3 sets each

5. EXERCISE TYPE PREFERENCES (IMPORTANT):
   - Identify preferred or excluded exercise types
   - Phrases: "no cardio", "hate burpees", "love compound movements", "no isolation exercises", etc.
   - Action: Include/exclude based on preference
   - Examples:
     * "No cardio" → Exclude running, jumping jacks, mountain climbers
     * "Compound movements only" → Focus on squats, deadlifts, bench press, rows
     * "I hate burpees" → Never include burpees

6. INTENSITY & EXPERIENCE LEVEL (IMPORTANT):
   - Identify fitness level or intensity preferences
   - Phrases: "beginner", "advanced", "low intensity", "high intensity", "easy workouts", etc.
   - Action: Filter exercises by Level field and adjust sets/reps
   - Examples:
     * "I'm a beginner" → Use Level: "Beginner" exercises, higher reps (12-15)
     * "Advanced lifter" → Use Level: "Expert" exercises, lower reps (6-8)
     * "Low intensity" → Fewer sets, longer rest, easier exercises

7. SPECIFIC EXERCISE EXCLUSIONS (IMPORTANT):
   - Identify specific exercises to avoid
   - Phrases: "no deadlifts", "don't like push-ups", "can't do pull-ups", etc.
   - Action: Never include those specific exercises
   - Examples:
     * "No deadlifts" → Exclude all deadlift variations
     * "Can't do pull-ups" → Use alternatives like lat pulldowns or rows

8. WORKOUT FOCUS PREFERENCES (HELPFUL):
   - Identify specific muscle groups or goals
   - Phrases: "focus on upper body", "want bigger arms", "core strength", etc.
   - Action: Prioritize those areas in the workout split
   - Examples:
     * "Focus on upper body" → More upper body days, fewer leg days
     * "Want bigger arms" → Include extra bicep/tricep work

SAFETY OVERRIDE:
- If ANY preference seems medically unsafe or could cause injury, IGNORE it and explain why in the 'notes' field
- Examples of unsafe requests: "train same muscle every day", "no rest days", "only do one exercise"

REMEMBER: User preferences are MANDATORY unless they compromise safety. Analyze the preferences carefully and respect ALL logical requests.
"""
    
    prompt = f"""You are a professional fitness trainer creating a personalized 7-day workout program.

USER PROFILE:
- Age: {age}
- Gender: {gender}
- Height: {height_cm} cm
- Current Weight: {weight_kg} kg
- Target Weight: {target_weight_kg} kg
- Weekly Goal: {weekly_goal_kg} kg/week
- Goal: {goal_text}

{preferences_section}

{exercise_db_str}

INSTRUCTIONS:
1. FIRST, READ USER PREFERENCES VERY CAREFULLY:
   - Read each word slowly and understand what the user is asking
   - If they say "no monday and saturday", mark ONLY Monday and Saturday as rest
   - If they say "4 days only", give EXACTLY 4 workout days (not 5, not 3)
   - Do NOT add extra rest days unless explicitly requested
   - Do NOT misinterpret which specific days they mentioned
   - Check for day restrictions, injuries, equipment, time, intensity, exclusions, and focus

2. Create a 7-day workout plan (Monday to Sunday)
   CRITICAL: You MUST include ALL 7 DAYS in your response, even if some are rest days.
   Do NOT skip or omit any days. The workout_plan array must have exactly 7 elements.

3. For each day, specify:
   - "day": Day name (Monday, Tuesday, etc.)
   - "focus": Focus area (e.g., "Chest & Triceps", "Legs & Glutes", "Back & Biceps", "Rest Day")
   - "exercises": List of exercises with:
     * "name": Exercise name (MUST be from the database above)
     * "sets": Number of sets (e.g., 3)
     * "reps": Rep range (e.g., "12-15" or "10-12")
     * "equipment": Equipment needed
     * "bodyPart": Target body part
   - For rest days, use "focus": "Rest Day" and "exercises": []

4. WORKOUT SPLIT STRATEGY:
   - For "Reduce body fat" / "Weight loss": 4-5 workout days with full-body or upper/lower split + cardio
   - For "Build muscle" / "Muscle gain": 5-6 workout days with traditional split (Push/Pull/Legs or Bro Split)
   - For "General fitness": 3-4 workout days with balanced full-body or upper/lower split

5. SETS & REPS GUIDELINES:
   - Strength: 3-5 sets of 4-6 reps
   - Hypertrophy (muscle growth): 3-4 sets of 8-12 reps
   - Endurance: 2-3 sets of 15-20 reps
   - Bodyweight: 3-4 sets of 10-15 reps

6. REST DAYS: Include 1-2 rest days per week (in addition to any days the user requested off)

7. EXERCISE SELECTION:
   - ONLY use exercises from the database provided above
   - Match exercises to the focus area (e.g., for "Chest & Triceps", use chest and triceps exercises)
   - Consider user's equipment availability
   - Progress from easier to harder exercises

8. OUTPUT FORMAT: Return ONLY valid JSON in this exact format:
{{
  "workout_plan": [
    {{
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [
        {{
          "name": "Push-up",
          "sets": 3,
          "reps": "12-15",
          "equipment": "Body Only",
          "bodyPart": "Chest"
        }}
      ]
    }}
  ],
  "notes": "Brief explanation of the workout plan strategy and any important notes"
}}

Generate the workout plan now:"""

    return prompt


def generate_workout_for_user(df, age, gender, height_cm, weight_kg, target_weight_kg, 
                               weekly_goal_kg, goal_text, hf_api_key, workout_preferences=None):
    """
    Generate a personalized 7-day workout plan
    
    Args:
        df: Exercise database DataFrame
        age: User's age
        gender: User's gender
        height_cm: Height in cm
        weight_kg: Current weight in kg
        target_weight_kg: Target weight in kg
        weekly_goal_kg: Weekly weight change goal
        goal_text: User's goal
        hf_api_key: Hugging Face API key
        workout_preferences: Optional user preferences
    
    Returns:
        Dict with workout_plan and notes
    """
    
    # Build the prompt
    prompt = build_prompt(
        age=age,
        gender=gender,
        height_cm=height_cm,
        weight_kg=weight_kg,
        target_weight_kg=target_weight_kg,
        weekly_goal_kg=weekly_goal_kg,
        goal_text=goal_text,
        exercises_df=df,
        workout_preferences=workout_preferences
    )
    
    # Call Hugging Face API (new router endpoint)
    url = "https://router.huggingface.co/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {hf_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "meta-llama/Llama-3.2-3B-Instruct",  # 128K token context window
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 2500,
        "temperature": 0.2,  # Lowered for strict adherence to instructions
        "top_p": 0.9
    }
    
    print("🤖 Calling Hugging Face API for workout plan generation...")
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    
    if response.status_code != 200:
        raise Exception(f"HF API error: {response.status_code} - {response.text}")
    
    result = response.json()
    
    # Extract generated text from new chat completions format
    try:
        generated_text = result['choices'][0]['message']['content']
    except (KeyError, IndexError) as e:
        print(f"❌ Error extracting response: {e}")
        print(f"Response structure: {result}")
        return {
            "workout_plan": [],
            "notes": f"Error extracting AI response. Please try again."
        }
    
    print(f"📝 Raw LLM response length: {len(generated_text)} characters")
    
    # Parse JSON from response
    try:
        # Try to find JSON in the response
        json_start = generated_text.find('{')
        json_end = generated_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON found in response")
        
        json_str = generated_text[json_start:json_end]
        workout_data = json.loads(json_str)
        
        print(f"✅ Successfully parsed workout plan with {len(workout_data.get('workout_plan', []))} days")
        
        return workout_data
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Response text: {generated_text[:500]}...")
        
        # Return a fallback response
        return {
            "workout_plan": [],
            "notes": f"Error parsing AI response. Please try again. Error: {str(e)}"
        }
