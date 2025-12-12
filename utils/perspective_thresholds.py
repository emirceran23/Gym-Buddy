import json
from typing import Dict


def load_thresholds(json_path: str) -> Dict:
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def pick_thresholds_for_video(model: Dict, width_to_height_med: float) -> Dict:
    """
    Select bucket thresholds for a video given its width_to_height_med feature.
    Falls back to global if no bucket matches.
    """
    if model is None or "buckets" not in model:
        return model.get("global", {}) if model else {}

    # Fast path for 2-class (frontal/sideway) using split_threshold
    split = model.get("split_threshold")
    if split is not None:
        buckets = model["buckets"]
        # width_to_height high => frontal; low => sideway
        chosen = None
        if width_to_height_med < split:
            # sideway
            chosen = next((b for b in buckets if b.get("name") == "sideway"), None)
        else:
            chosen = next((b for b in buckets if b.get("name") == "frontal"), None)
        if chosen is not None:
            return {"arm_up": chosen["arm_up"], "arm_down": chosen["arm_down"], "torso": chosen["torso"]}

    # Generic N-bucket selection
    buckets = model["buckets"]
    for b in buckets:
        lo, hi = b.get("range", [None, None])
        if lo is None or hi is None:
            continue
        if width_to_height_med >= lo and width_to_height_med <= hi:
            return {"arm_up": b["arm_up"], "arm_down": b["arm_down"], "torso": b["torso"]}

    # Otherwise nearest center
    best = None
    best_dist = float("inf")
    for b in buckets:
        lo, hi = b.get("range", [None, None])
        if lo is None or hi is None:
            continue
        center = 0.5 * (lo + hi)
        d = abs(width_to_height_med - center)
        if d < best_dist:
            best_dist = d
            best = b
    if best is not None:
        return {"arm_up": best["arm_up"], "arm_down": best["arm_down"], "torso": best["torso"]}

    # Fallback
    return model.get("global", {})


