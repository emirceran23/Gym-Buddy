import os
import json
import random
from typing import Tuple, Dict, Any

import pandas as pd
import requests

# =========================
# CONFIG
# =========================

HF_MODEL = "google/gemma-2-2b-it"  # recommended small instruct model

# Adjust to your actual CSV path & column names
DEFAULT_DATASET_PATH = "data/GYM.csv"
COL_GENDER = "Gender"
COL_GOAL = "Goal"
COL_BMI_CAT = "BMI Category"
COL_EXERCISE = "Exercise Schedule"
COL_MEAL = "Meal Plan"


# =========================
# DATASET FUNCTIONS
# =========================

def load_dataset(path: str = DEFAULT_DATASET_PATH) -> pd.DataFrame:
    """
    Load the Kaggle dataset as a DataFrame.
    """
    df = pd.read_csv(path)
    # Optional: sanity check
    # print("Loaded dataset with columns:", df.columns.tolist())
    return df


def get_general_recommendations(
    df: pd.DataFrame,
    gender: str,
    goal: str,
    bmi_cat: str
) -> Tuple[str, str]:
    """
    Return (exercise_schedule, meal_plan) from the dataset
    based on Gender, Goal, and BMI Category.

    If no exact match, tries a softer fallback (ignoring BMI).
    Raises ValueError if still nothing is found.
    """
    mask = (
        df[COL_GENDER].str.lower() == gender.lower()
    ) & (
        df[COL_GOAL].str.lower() == goal.lower()
    ) & (
        df[COL_BMI_CAT].str.lower() == bmi_cat.lower()
    )

    subset = df[mask]

    if subset.empty:
        # fallback: ignore BMI category
        subset = df[
            (df[COL_GENDER].str.lower() == gender.lower())
            & (df[COL_GOAL].str.lower() == goal.lower())
        ]

    if subset.empty:
        raise ValueError(
            f"No recommendations found for gender={gender}, goal={goal}, bmi_cat={bmi_cat}"
        )

    row = subset.sample(n=1, random_state=random.randint(0, 100000)).iloc[0]
    exercise_schedule = str(row[COL_EXERCISE])
    meal_plan = str(row[COL_MEAL])

    return exercise_schedule, meal_plan


# =========================
# USER PROFILE HELPERS
# =========================

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100.0
    return weight_kg / (height_m ** 2)


def bmi_to_category(bmi: float) -> str:
    """
    Convert numeric BMI to a category string.

    Adjust labels to match your dataset exactly.
    """
    if bmi < 18.5:
        return "Underweight"
    elif bmi < 25:
        return "Normal weight"
    elif bmi < 30:
        return "Overweight"
    else:
        return "Obesity"


def map_gender(user_gender: str) -> str:
    g = user_gender.strip().lower()
    if g in ("male", "m"):
        return "Male"
    elif g in ("female", "f"):
        return "Female"
    # fallback
    return user_gender.capitalize()


def map_goal(user_goal: str) -> str:
    """
    Map user goal text to the dataset's goal labels.
    Adjust to your dataset's unique values.
    """
    g = user_goal.strip().lower()
    if "fat" in g or "burn" in g or "lose" in g or "loss" in g or "cut" in g:
        return "fat_burn"
    elif "muscle" in g or "gain" in g or "bulk" in g:
        return "muscle_gain"
    return user_goal.title()


def prepare_user_profile(
    age: int,
    gender: str,
    height_cm: float,
    weight_kg: float,
    target_weight_kg: float,
    weekly_goal_kg: float,
    goal_text: str
) -> Dict[str, Any]:
    """
    Given raw user input, compute BMI, BMI category, mappings, and
    return a structured user_profile dict.
    """
    bmi = calculate_bmi(weight_kg, height_cm)
    bmi_category = bmi_to_category(bmi)
    gender_cat = map_gender(gender)
    goal_cat = map_goal(goal_text)

    user_profile = {
        "age": age,
        "gender": gender_cat,
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "bmi": bmi,
        "bmi_category": bmi_category,
        "target_weight_kg": target_weight_kg,
        "weekly_goal_kg": weekly_goal_kg,
        "goal_label": goal_cat  # label used in dataset
    }
    return user_profile


# =========================
# LLM PROMPT & CALL
# =========================

def build_prompt(
    user_profile: Dict[str, Any],
    exercise_reco: str,
    diet_reco: str
) -> str:
    """
    Build the prompt for the LLM, including schema and dataset recommendations.

    We still provide BOTH exercise schedule and meal plan from the dataset,
    but we ask the LLM to output ONLY a diet plan.
    """

    schema_description = """
You are a fitness and nutrition planning assistant.

TASK:
Given the user profile and dataset-based general recommendations, create a realistic,
beginner-friendly, safe 7-day diet plan.

IMPORTANT RULES:
- Output ONLY valid JSON.
- Do NOT include any explanation before or after the JSON.
- Follow this exact JSON schema:

{
  "diet_plan": [
    {
      "day": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
      "meals": [
        {
          "name": "breakfast | lunch | dinner | snack",
          "description": "foods and approximate portions",
          "kcal": 0,
          "protein_g": 0,
          "notes": "optional note or empty string"
        }
      ]
    }
  ],
  "notes": "short disclaimer reminding the user to consult a doctor/dietitian"
}

Constraints:
- Keep it appropriate for a beginner.
- Use the Exercise Schedule and Meal Plan from the dataset as the main guideline,
  but DO NOT output any exercise plan in the JSON. Only output the diet_plan and notes.
- Avoid extreme deficits or crash diets.
- If something is uncertain, choose a conservative/safe option.
"""

    u = user_profile
    user_text = f"""
User profile:
- Age: {u['age']}
- Gender: {u['gender']}
- Height_cm: {u['height_cm']}
- Weight_kg: {u['weight_kg']}
- BMI: {u['bmi']:.1f}
- BMI Category: {u['bmi_category']}
- Target_weight_kg: {u['target_weight_kg']}
- Weekly_weight_change_goal_kg: {u['weekly_goal_kg']}

Dataset-based recommendations:
- General Exercise Schedule: {exercise_reco}
- General Meal Plan: {diet_reco}
"""

    return schema_description + "\n" + user_text


def call_llm(
    prompt: str,
    hf_api_key: str | None = None,
    max_new_tokens: int = 3000,
    temperature: float = 0.4
) -> str:
    """
    Call Hugging Face Inference Providers via the OpenAI-compatible
    /v1/chat/completions endpoint and return the assistant's text.
    """

    api_key = hf_api_key or os.getenv("HF_API_KEY")
    if not api_key:
        raise ValueError("No Hugging Face API key provided (HF_API_KEY not set).")

    # ✅ Correct endpoint
    url = "https://router.huggingface.co/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": HF_MODEL,  # ✅ model goes here, not in the URL
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": max_new_tokens,
        "temperature": temperature,
        "stream": False
    }

    resp = requests.post(url, headers=headers, json=payload)

    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError:
        print("HF request failed")
        print("Status code:", resp.status_code)
        print("Body:", resp.text)
        raise

    data = resp.json()

    # OpenAI-style response:
    # {
    #   "choices": [
    #     {
    #       "message": {"role": "assistant", "content": "..."}
    #     }
    #   ],
    #   ...
    # }
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        print("Unexpected response format:", json.dumps(data, indent=2))
        raise


def extract_json(raw_text: str) -> Dict[str, Any]:
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Could not find JSON braces in model output.\n\nFULL OUTPUT:\n" + raw_text)

    json_str = raw_text[start:end + 1]

    # DEBUG: print or save it to inspect
    print("=== RAW JSON STRING FROM MODEL ===")
    print(json_str)

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print("JSON decode error:", e)
        # Optional: see the exact line that fails
        lines = json_str.splitlines()
        if hasattr(e, "lineno") and 1 <= e.lineno <= len(lines):
            print(f"\nProblematic line {e.lineno}:")
            print(lines[e.lineno - 1])
        raise


# =========================
# HIGH-LEVEL PIPELINE FUNCTION
# =========================

def generate_plan_for_user(
    df: pd.DataFrame,
    age: int,
    gender: str,
    height_cm: float,
    weight_kg: float,
    target_weight_kg: float,
    weekly_goal_kg: float,
    goal_text: str,
    hf_api_key: str | None = None,
    model_id: str = HF_MODEL
) -> Dict[str, Any]:
    """
    High-level function:

    1. Build user profile (BMI, mappings).
    2. Get general recommendations from dataset (exercise + meal).
    3. Build LLM prompt (includes both, but asks for diet-only).
    4. Call LLM and parse JSON.
    5. Return diet-only dict (diet_plan + notes).
    """

    # 1) user profile
    user_profile = prepare_user_profile(
        age=age,
        gender=gender,
        height_cm=height_cm,
        weight_kg=weight_kg,
        target_weight_kg=target_weight_kg,
        weekly_goal_kg=weekly_goal_kg,
        goal_text=goal_text
    )

    # 2) dataset-based recommendations (exercise + diet)
    exercise_reco, diet_reco = get_general_recommendations(
        df,
        gender=user_profile["gender"],
        goal=user_profile["goal_label"],
        bmi_cat=user_profile["bmi_category"]
    )

    # 3) prompt
    prompt = build_prompt(user_profile, exercise_reco, diet_reco)

    # 4) LLM call + parse
    raw_output = call_llm(
        prompt,
        hf_api_key=hf_api_key
    )
    full_plan = extract_json(raw_output)

    # 5) Ensure we ONLY return diet-related info, even if the model adds extras
    diet_only = {
        "diet_plan": full_plan.get("diet_plan", []),
        "notes": full_plan.get("notes", "")
    }

    return diet_only


# =========================
# SAVE FUNCTIONS
# =========================

def save_diet_plan(plan: Dict[str, Any], base_name: str = "plan") -> None:
    """
    Save a single JSON file containing the diet plan (and optional notes):
      - {base_name}_diet.json
    """
    diet_path = f"{base_name}_diet.json"

    with open(diet_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)

    print(f"Saved: {diet_path}")


# =========================
# EXAMPLE USAGE
# =========================

if __name__ == "__main__":
    # 1) Load dataset once
    df = load_dataset()

    # 2) Example: call function with hardcoded values
    plan = generate_plan_for_user(
        df=df,
        age=24,
        gender="male",
        height_cm=172,
        weight_kg=74,
        target_weight_kg=75,
        weekly_goal_kg=0.2,  # gain 0.2 kg / week
        goal_text="gain muscle",
        hf_api_key="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"  # <-- put your key here or use env var
    )

    # 3) Save diet plan to file
    save_diet_plan(plan, base_name="new")
