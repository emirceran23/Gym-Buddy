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

IMPORTANT: Respect these preferences ONLY if they are logical, safe, and medically sound.
- If the user says "no weekends", schedule workouts Monday-Friday only
- If the user says "bodyweight only", use only exercises with Equipment: "Body Only"
- If the user says "I have dumbbells", prioritize dumbbell exercises
- If any preference seems unsafe or illogical, you may ignore it and explain why in the 'notes' field
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
1. Create a 7-day workout plan (Monday to Sunday)
2. For each day, specify:
   - "day": Day name (Monday, Tuesday, etc.)
   - "focus": Focus area (e.g., "Chest & Triceps", "Legs & Glutes", "Back & Biceps", "Rest Day")
   - "exercises": List of exercises with:
     * "name": Exercise name (MUST be from the database above)
     * "sets": Number of sets (e.g., 3)
     * "reps": Rep range (e.g., "12-15" or "10-12")
     * "equipment": Equipment needed
     * "bodyPart": Target body part

3. WORKOUT SPLIT STRATEGY:
   - For "Reduce body fat" / "Weight loss": 4-5 workout days with full-body or upper/lower split + cardio
   - For "Build muscle" / "Muscle gain": 5-6 workout days with traditional split (Push/Pull/Legs or Bro Split)
   - For "General fitness": 3-4 workout days with balanced full-body or upper/lower split

4. SETS & REPS GUIDELINES:
   - Strength: 3-5 sets of 4-6 reps
   - Hypertrophy (muscle growth): 3-4 sets of 8-12 reps
   - Endurance: 2-3 sets of 15-20 reps
   - Bodyweight: 3-4 sets of 10-15 reps

5. REST DAYS: Include 1-2 rest days per week

6. EXERCISE SELECTION:
   - ONLY use exercises from the database provided above
   - Match exercises to the focus area (e.g., for "Chest & Triceps", use chest and triceps exercises)
   - Consider user's equipment availability
   - Progress from easier to harder exercises

7. OUTPUT FORMAT: Return ONLY valid JSON in this exact format:
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
        "model": "google/gemma-2-2b-it",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 2500,
        "temperature": 0.7,
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
