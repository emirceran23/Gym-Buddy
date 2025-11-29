import cv2
import numpy as np
from pose_detection import PoseDetector
import time
import csv
import os
from datetime import datetime


class BicepsCurlCounter:
    """
    Biceps curl repetition counter using pose detection
    """
    
    def __init__(self, 
                 angle_threshold_down=160,  # Arm extended (down position) - >160°
                 angle_threshold_up=50,     # Arm curled (up position) - <50°
                 torso_angle_threshold=30,  # Max torso angle deviation during transition - 20-25°
                 min_hold_time=0.2,         # Minimum time to hold position
                 min_landmark_confidence=0.5,  # Minimum landmark confidence for measurement
                 depth_threshold=0.1,       # Minimum z-difference to filter background arm
                 depth_filter_enabled=True): # Enable depth-based filtering
        """
        Initialize biceps curl counter
        
        Args:
            angle_threshold_down: Minimum angle for down position (degrees) - arm > 160°
            angle_threshold_up: Maximum angle for up position (degrees) - arm < 50°
            torso_angle_threshold: Maximum torso angle deviation during transition (degrees) - 20-25°
            min_hold_time: Minimum time to hold position to count (seconds)
            min_landmark_confidence: Minimum landmark visibility confidence (0.0-1.0)
            depth_threshold: Minimum z-difference to consider one arm occluded (default: 0.1)
            depth_filter_enabled: Whether to apply depth-based filtering (default: True)
        """
        self.angle_threshold_down = angle_threshold_down
        self.angle_threshold_up = angle_threshold_up
        self.torso_angle_threshold = torso_angle_threshold
        self.min_hold_time = min_hold_time
        self.min_landmark_confidence = min_landmark_confidence
        self.depth_threshold = depth_threshold
        self.depth_filter_enabled = depth_filter_enabled

        self.violation_min_duration = 0.25  # seconds to consider a violation meaningful

         # Torso violation tracking (sliding window of 3 frames)
        self.left_torso_angles = []  # Store last 3 frames
        self.right_torso_angles = []  # Store last 3 frames
        # Flag set to True if ANY 3-frame average exceeds threshold during ENTIRE cycle
        self.left_torso_violation_during_transition = False
        self.right_torso_violation_during_transition = False
        self.left_max_torso_angle = 0.0
        self.right_max_torso_angle = 0.0
        # Hysteresis zones to prevent oscillation
        self.hysteresis = 0  # degrees
        
        # Arm visibility tracking
        self.left_arm_visible = True
        self.right_arm_visible = True
        self.left_avg_confidence = 1.0
        self.right_avg_confidence = 1.0
        self.left_visibility_message = ""
        self.right_visibility_message = ""
        
        # Rep counting variables
        self.left_reps = 0
        self.right_reps = 0
        self.left_correct_reps = 0
        self.right_correct_reps = 0
        self.left_incorrect_reps = 0
        self.right_incorrect_reps = 0
        self.total_reps = 0
        
        # State tracking for left arm
        self.left_state = "unknown"  # "up", "down", "transition", "unknown"
        self.left_last_state_time = time.time()
        self.left_angle_history = []
        self.left_previous_state = "unknown"  # Track previous state for rep counting
        self.left_rep_is_valid = True
        # Pending (dwell) state değişimi için
        self.left_pending_state = None
        self.left_pending_since = None
        # Track which states have been visited in current rep
        self.left_visited_down = False
        self.left_visited_transition = False
        self.left_visited_up = False
        # Ordered sequence progress flags (left)
        self.left_started_from_down = False
        self.left_reached_up_in_cycle = False
        self.left_descending_to_down = False
        # Track torso violation during transition phase
        self.left_torso_violation_during_transition = False
        
        # Reason tracking for invalid reps (per arm, per active rep)
        self.left_invalid_reasons = set()
        self.right_invalid_reasons = set()
        # Remember the last completed rep's reasons (for UI/logs)
        self.left_last_rep_reasons = []
        self.right_last_rep_reasons = []
        # Optional: range-of-motion requirement (degrees). Set 0 to disable.
        self.min_rom_degrees = 0
        # Track extremums within a rep to evaluate ROM at completion
        self.left_min_angle_in_rep = None
        self.left_max_angle_in_rep = None
        self.right_min_angle_in_rep = None
        self.right_max_angle_in_rep = None
        # Threshold hit flags within a rep (for better explanations)
        self.left_hit_up = False
        self.left_hit_down = False
        self.right_hit_up = False
        self.right_hit_down = False
        # State tracking for right arm
        self.right_state = "unknown"
        self.right_last_state_time = time.time()
        self.right_angle_history = []
        self.right_previous_state = "unknown"  # Track previous state for rep counting
        self.right_rep_is_valid = True
        self.right_pending_state = None
        self.right_pending_since = None
        # Track which states have been visited in current rep
        self.right_visited_down = False
        self.right_visited_transition = False
        self.right_visited_up = False
        # Ordered sequence progress flags (right)
        self.right_started_from_down = False
        self.right_reached_up_in_cycle = False
        self.right_descending_to_down = False
        # Track torso violation during transition phase
        self.right_torso_violation_during_transition = False
        # History for smoothing
        self.history_length = 12
        
        # Store raw angles (before smoothing) for CSV export
        self.left_raw_angle = None
        self.right_raw_angle = None
        
        # Rep cycle index tracking (which rep cycle is this frame part of)
        self.left_cycle_index = 0
        self.right_cycle_index = 0
        
        # Debug mode
        self.debug_mode = True
        
        # Alignment tracking
        self.left_alignment_warning = False
        self.right_alignment_warning = False
    
    def update(self, left_arm_angle, right_arm_angle,
               left_alignment=True, right_alignment=True,
               left_torso_angle=0, right_torso_angle=0,
               left_arm_visible=True, right_arm_visible=True,
               left_confidence=1.0, right_confidence=1.0):
        current_time = time.time()

        # Store visibility information
        self.left_arm_visible = left_arm_visible
        self.right_arm_visible = right_arm_visible
        self.left_avg_confidence = left_confidence
        self.right_avg_confidence = right_confidence
        
        # Generate visibility messages
        if not left_arm_visible:
            self.left_visibility_message = f"Sol kol net görünmüyor (güven: {left_confidence*100:.0f}%)"
        else:
            self.left_visibility_message = ""
            
        if not right_arm_visible:
            self.right_visibility_message = f"Sağ kol net görünmüyor (güven: {right_confidence*100:.0f}%)"
        else:
            self.right_visibility_message = ""

        self.left_alignment_warning = not left_alignment
        self.right_alignment_warning = not right_alignment

                # Helper to update violation timers with 3-frame sliding window
        def _update_violation_timers(side, aligned, torso_angle):
            # Use 3-frame sliding window average for torso angle
            if side == 'left':
                # Track max torso
                self.left_max_torso_angle = max(self.left_max_torso_angle, torso_angle)
                
                # Add current angle to sliding window (keep last 3 frames)
                self.left_torso_angles.append(torso_angle)
                if len(self.left_torso_angles) > 3:
                    self.left_torso_angles.pop(0)
                
                # Check 3-frame average throughout entire rep cycle (not just during transition)
                if len(self.left_torso_angles) == 3:
                    avg_torso = np.mean(self.left_torso_angles)
                    if avg_torso > self.torso_angle_threshold:
                        self.left_torso_violation_during_transition = True

            else:
                # Track max torso
                self.right_max_torso_angle = max(self.right_max_torso_angle, torso_angle)
                
                # Add current angle to sliding window (keep last 3 frames)
                self.right_torso_angles.append(torso_angle)
                if len(self.right_torso_angles) > 3:
                    self.right_torso_angles.pop(0)
                
                # Check 3-frame average throughout entire rep cycle (not just during transition)
                if len(self.right_torso_angles) == 3:
                    avg_torso = np.mean(self.right_torso_angles)
                    if avg_torso > self.torso_angle_threshold:
                        self.right_torso_violation_during_transition = True
        
        # While rep is active (not in DOWN), update timers
        if self.left_state != "down":
            _update_violation_timers('left', left_alignment, left_torso_angle)
        if self.right_state != "down":
            _update_violation_timers('right', right_alignment, right_torso_angle)

        # Store raw angles for CSV export
        self.left_raw_angle = left_arm_angle
        self.right_raw_angle = right_arm_angle
        
        # Only update arm state if arm is visible
        if left_arm_angle is not None and left_arm_visible:
            self._update_arm_state('left', left_arm_angle, left_torso_angle, left_alignment, current_time)
        if right_arm_angle is not None and right_arm_visible:
            self._update_arm_state('right', right_arm_angle, right_torso_angle, right_alignment, current_time)

        return self.get_status()
    
    def _update_arm_state(self, arm, angle, torso_angle, is_aligned, current_time):
        """
        Tek kol için state güncellemesi (histerezis + dwell + torso/align gating)
        """
        # Kol tarafına göre referanslar
        if arm == 'left':
            state = self.left_state
            last_time = self.left_last_state_time
            history = self.left_angle_history
            previous_state = self.left_previous_state
            pending_state = self.left_pending_state
            pending_since = self.left_pending_since
        else:
            state = self.right_state
            last_time = self.right_last_state_time
            history = self.right_angle_history
            previous_state = self.right_previous_state
            pending_state = self.right_pending_state
            pending_since = self.right_pending_since

        # Smoothing
        history.append(angle)
        if len(history) > self.history_length:
            history.pop(0)
        smoothed_angle = float(np.mean(history))

        # --- ROM tracking: keep min/max angle seen since the rep started (use RAW angle) ---
        if arm == 'left':
            if self.left_min_angle_in_rep is not None or self.left_state != "down":
                self.left_min_angle_in_rep = angle if self.left_min_angle_in_rep is None else min(self.left_min_angle_in_rep, angle)
                self.left_max_angle_in_rep = angle if self.left_max_angle_in_rep is None else max(self.left_max_angle_in_rep, angle)
            # Threshold-hits for explanations
            if angle <= (self.angle_threshold_up + self.hysteresis):
                self.left_hit_up = True
            if angle >= (self.angle_threshold_down - self.hysteresis):
                self.left_hit_down = True
        else:
            if self.right_min_angle_in_rep is not None or self.right_state != "down":
                self.right_min_angle_in_rep = angle if self.right_min_angle_in_rep is None else min(self.right_min_angle_in_rep, angle)
                self.right_max_angle_in_rep = angle if self.right_max_angle_in_rep is None else max(self.right_max_angle_in_rep, angle)
            if angle <= (self.angle_threshold_up + self.hysteresis):
                self.right_hit_up = True
            if angle >= (self.angle_threshold_down - self.hysteresis):
                self.right_hit_down = True

        # Simple state determination based on RAW angle thresholds:
        # - > 160°: DOWN
        # - 50° - 160°: TRANSITION
        # - < 50°: UP
        if angle > self.angle_threshold_down:
            proposed = "down"
        elif angle < self.angle_threshold_up:
            proposed = "up"
        else:
            proposed = "transition"

        # Form info (used for reasons & UI, NOT to block commits)
        form_ok = is_aligned and (torso_angle <= self.torso_angle_threshold)

        # --- Dwell (min_hold_time) WITHOUT form gating ---
        commit = False
        if proposed == state:
            # No change; clear pending
            pending_state, pending_since = None, None
        else:
            # State change proposed; require dwell only
            if pending_state == proposed:
                if (current_time - pending_since) >= self.min_hold_time:
                    commit = True
            else:
                pending_state, pending_since = proposed, current_time

        # Commit edilirse state'i değiştir
        if commit:
            new_state = proposed

            # Track state visits (simplified - state already validated by angle)
            if arm == 'left':
                if new_state == "down":
                    self.left_visited_down = True
                elif new_state == "transition":
                    self.left_visited_transition = True
                elif new_state == "up":
                    self.left_visited_up = True
                # --- NEW: ordered-sequence progress flags (LEFT) ---
                # 1) start: DOWN -> (TRANSITION or UP)
                if state == "down" and new_state in ("transition", "up"):
                    self.left_started_from_down = True
                    self.left_reached_up_in_cycle = False
                    self.left_descending_to_down = False
                # 2) reached top: ... -> UP
                if new_state == "up" and self.left_started_from_down:
                    self.left_reached_up_in_cycle = True
                # 3) descending: UP -> TRANSITION
                if state == "up" and new_state == "transition" and self.left_reached_up_in_cycle:
                    self.left_descending_to_down = True
            else:
                if new_state == "down":
                    self.right_visited_down = True
                elif new_state == "transition":
                    self.right_visited_transition = True
                elif new_state == "up":
                    self.right_visited_up = True
                # --- NEW: ordered-sequence progress flags (RIGHT) ---
                if state == "down" and new_state in ("transition", "up"):
                    self.right_started_from_down = True
                    self.right_reached_up_in_cycle = False
                    self.right_descending_to_down = False
                if new_state == "up" and self.right_started_from_down:
                    self.right_reached_up_in_cycle = True
                if state == "up" and new_state == "transition" and self.right_reached_up_in_cycle:
                    self.right_descending_to_down = True

            # Rep-valid başlangıç noktası: DOWN->TRANSITION or DOWN->UP (start of new rep cycle)
            if state == "down" and new_state in ("transition", "up"):
                if arm == 'left':
                    self.left_rep_is_valid = True
                    self.left_invalid_reasons.clear()
                    self.left_min_angle_in_rep = None
                    self.left_max_angle_in_rep = None
                    self.left_hit_up = False
                    self.left_hit_down = False
                    # Don't reset visited_down - we're already in it and entering transition/up state
                    # Reset only transition and up flags for the new rep cycle
                    self.left_visited_transition = False
                    self.left_visited_up = False
                    self.left_torso_violation_during_transition = False
                    # Reset torso angles sliding window for new cycle
                    self.left_torso_angles = []
                    # Do not increment cycle index here; increment only when cycle completes (return to DOWN)
                else:
                    self.right_rep_is_valid = True
                    self.right_invalid_reasons.clear()
                    self.right_min_angle_in_rep = None
                    self.right_max_angle_in_rep = None
                    self.right_hit_up = False
                    self.right_hit_down = False
                    # Don't reset visited_down - we're already in it and entering transition/up state
                    # Reset only transition and up flags for the new rep cycle
                    self.right_visited_transition = False
                    self.right_visited_up = False
                    self.right_torso_violation_during_transition = False
                    # Reset torso angles sliding window for new cycle
                    self.right_torso_angles = []
                    # Do not increment cycle index here; increment only when cycle completes (return to DOWN)

            # Rep tamamlama: UP->DOWN (DOWN'a kilitlenince say)
            if state in ("up", "transition") and new_state == "down":
                now = current_time

                if arm == 'left':
                    # Clear previous reasons (we'll rebuild)
                    self.left_invalid_reasons.clear()

                    # Check if all three states were visited correctly
                    if not self.left_visited_down:
                        self.left_rep_is_valid = False
                        self.left_invalid_reasons.add(f"Did not reach DOWN position (arm angle must be > {self.angle_threshold_down}°)")
                    
                    if not self.left_visited_transition:
                        self.left_rep_is_valid = False
                        self.left_invalid_reasons.add(f"No transition detected")
                    
                    if not self.left_visited_up:
                        self.left_rep_is_valid = False
                        self.left_invalid_reasons.add(f"Did not reach UP position (arm angle must be < {self.angle_threshold_up}°)")

                    # Check torso violation during entire rep cycle
                    if self.left_torso_violation_during_transition:
                        self.left_rep_is_valid = False
                        self.left_invalid_reasons.add(f"Torso angle exceeded {self.torso_angle_threshold}° (3-frame avg) during rep cycle")

                    # ROM check
                    rom = 0.0
                    if self.left_min_angle_in_rep is not None and self.left_max_angle_in_rep is not None:
                        rom = self.left_max_angle_in_rep - self.left_min_angle_in_rep
                    if self.min_rom_degrees > 0 and rom < self.min_rom_degrees:
                        self.left_rep_is_valid = False
                        self.left_invalid_reasons.add(f"Insufficient ROM ({rom:.0f}° < {self.min_rom_degrees}°)")

                    # Note: Torso violation already checked via 3-frame sliding window

                    # Finalize last reasons
                    self.left_last_rep_reasons = sorted(self.left_invalid_reasons) if not self.left_rep_is_valid else []

                else:
                    self.right_invalid_reasons.clear()

                    # Check if all three states were visited correctly
                    if not self.right_visited_down:
                        self.right_rep_is_valid = False
                        self.right_invalid_reasons.add(f"Did not reach DOWN position (arm angle must be > {self.angle_threshold_down}°)")
                    
                    if not self.right_visited_transition:
                        self.right_rep_is_valid = False
                        self.right_invalid_reasons.add(f"No transition detected")
                    
                    if not self.right_visited_up:
                        self.right_rep_is_valid = False
                        self.right_invalid_reasons.add(f"Did not reach UP position (arm angle must be < {self.angle_threshold_up}°)")

                    # Check torso violation during entire rep cycle
                    if self.right_torso_violation_during_transition:
                        self.right_rep_is_valid = False
                        self.right_invalid_reasons.add(f"Torso angle exceeded {self.torso_angle_threshold}° (3-frame avg) during rep cycle")

                    # ROM check
                    rom = 0.0
                    if self.right_min_angle_in_rep is not None and self.right_max_angle_in_rep is not None:
                        rom = self.right_max_angle_in_rep - self.right_min_angle_in_rep
                    if self.min_rom_degrees > 0 and rom < self.min_rom_degrees:
                        self.right_rep_is_valid = False
                        self.right_invalid_reasons.add(f"Insufficient ROM ({rom:.0f}° < {self.min_rom_degrees}°)")

                    # Note: Torso violation already checked via 3-frame sliding window

                    self.right_last_rep_reasons = sorted(self.right_invalid_reasons) if not self.right_rep_is_valid else []

                # --- NEW: count only if full ordered sequence down->transition->up->transition->down happened
                should_count = False
                if arm == 'left':
                    if self.left_started_from_down and self.left_reached_up_in_cycle and self.left_descending_to_down:
                        should_count = True
                else:
                    if self.right_started_from_down and self.right_reached_up_in_cycle and self.right_descending_to_down:
                        should_count = True

                if should_count:
                    self._increment_rep(arm)
                    if arm == 'left':
                        self.left_cycle_index += 1
                    else:
                        self.right_cycle_index += 1

                # After landing in DOWN, always reset the progress flags so next rep starts clean
                if arm == 'left':
                    self.left_started_from_down = False
                    self.left_reached_up_in_cycle = False
                    self.left_descending_to_down = False
                else:
                    self.right_started_from_down = False
                    self.right_reached_up_in_cycle = False
                    self.right_descending_to_down = False
                
                # Reset angle history and torso angles for new rep
                if arm == 'left':
                    self.left_angle_history = []
                    self.left_torso_angles = []
                else:
                    self.right_angle_history = []
                    self.right_torso_angles = []

                # Console summary (ALWAYS prints one line)
                if arm == 'left':
                    if self.left_last_rep_reasons:
                        print("↪ Left rep INCORRECT: " + "; ".join(self.left_last_rep_reasons))
                    else:
                        print("✓ Left rep CORRECT")
                else:
                    if self.right_last_rep_reasons:
                        print("↪ Right rep INCORRECT: " + "; ".join(self.right_last_rep_reasons))
                    else:
                        print("✓ Right rep CORRECT")


            # Debug
            if self.debug_mode:
                confidence = self.left_avg_confidence if arm == 'left' else self.right_avg_confidence
                print(f"[DEBUG] {arm.upper()} - State change: {state} -> {new_state} | "
                      f"Angle: {angle:.1f}° | Torso: {torso_angle:.1f}° | "
                      f"Aligned: {is_aligned} | Confidence: {confidence*100:.0f}% | form_ok={form_ok}")

            # Yaz
            if arm == 'left':
                self.left_previous_state = state
                self.left_state = new_state
                self.left_last_state_time = current_time
                self.left_pending_state, self.left_pending_since = None, None
            else:
                self.right_previous_state = state
                self.right_state = new_state
                self.right_last_state_time = current_time
                self.right_pending_state, self.right_pending_since = None, None

        else:
            # Commit edilmediyse pending'i geri yaz
            if arm == 'left':
                self.left_pending_state, self.left_pending_since = pending_state, pending_since
            else:
                self.right_pending_state, self.right_pending_since = pending_state, pending_since
    
    def _increment_rep(self, arm):
        """
        Increment rep count for specified arm
        Note: Total reps always increments, correct reps only increment if form is valid
        
        Args:
            arm: 'left' or 'right'
        """
        # Always increment total reps (both correct and incorrect)
        self.total_reps += 1
        
        if arm == 'left':
            self.left_reps += 1
            if self.left_rep_is_valid:
                self.left_correct_reps += 1
            else:
                self.left_incorrect_reps += 1
        else:
            self.right_reps += 1
            if self.right_rep_is_valid:
                self.right_correct_reps += 1
            else:
                self.right_incorrect_reps += 1
        
        # Print rep summary
        status = "CORRECT" if (arm == 'left' and self.left_rep_is_valid) or (arm == 'right' and self.right_rep_is_valid) else "INCORRECT"
        #print(f"🎯 Rep {self.total_reps} ({status}): {arm.capitalize()} arm 🎯")
    
    def get_status(self):
        """
        Get current status of rep counter
        """
        # Calculate smoothed angles if available
        left_smoothed = float(np.mean(self.left_angle_history)) if self.left_angle_history else None
        right_smoothed = float(np.mean(self.right_angle_history)) if self.right_angle_history else None
        
        return {
            'left_reps': self.left_reps,
            'right_reps': self.right_reps,
            'left_correct_reps': self.left_correct_reps,
            'right_correct_reps': self.right_correct_reps,
            'left_incorrect_reps': self.left_incorrect_reps,
            'right_incorrect_reps': self.right_incorrect_reps,
            'total_reps': self.total_reps,
            'left_state': self.left_state,
            'right_state': self.right_state,
            'left_alignment_warning': self.left_alignment_warning,
            'right_alignment_warning': self.right_alignment_warning,
            'is_active': self.left_state != "unknown" or self.right_state != "unknown",
            'left_last_rep_reasons': self.left_last_rep_reasons,
            'right_last_rep_reasons': self.right_last_rep_reasons,
            'left_raw_angle': self.left_raw_angle,
            'right_raw_angle': self.right_raw_angle,
            'left_smoothed_angle': left_smoothed,
            'right_smoothed_angle': right_smoothed,
            'left_cycle_index': self.left_cycle_index,
            'right_cycle_index': self.right_cycle_index,
            'left_arm_visible': self.left_arm_visible,
            'right_arm_visible': self.right_arm_visible,
            'left_avg_confidence': self.left_avg_confidence,
            'right_avg_confidence': self.right_avg_confidence,
            'left_visibility_message': self.left_visibility_message,
            'right_visibility_message': self.right_visibility_message
        }
    
    def reset(self):
        """
        Reset rep counter
        """
        self.left_reps = 0
        self.right_reps = 0
        self.left_correct_reps = 0
        self.right_correct_reps = 0
        self.left_incorrect_reps = 0
        self.right_incorrect_reps = 0
        self.total_reps = 0
        self.left_state = "unknown"
        self.right_state = "unknown"
        self.left_last_state_time = time.time()
        self.right_last_state_time = time.time()
        self.left_angle_history = []
        self.right_angle_history = []
        self.left_alignment_warning = False
        self.right_alignment_warning = False
        self.left_rep_is_valid = True
        self.right_rep_is_valid = True
        self.left_pending_state = None
        self.left_pending_since = None
        self.right_pending_state = None
        self.right_pending_since = None
        self.left_invalid_reasons.clear()
        self.right_invalid_reasons.clear()
        self.left_last_rep_reasons = []
        self.right_last_rep_reasons = []
        self.left_min_angle_in_rep = None
        self.left_max_angle_in_rep = None
        self.right_min_angle_in_rep = None
        self.right_max_angle_in_rep = None
        self.left_hit_up = self.left_hit_down = False
        self.right_hit_up = self.right_hit_down = False
        self.left_max_torso_angle = self.right_max_torso_angle = 0.0
        # Reset state tracking variables
        self.left_visited_down = False
        self.left_visited_transition = False
        self.left_visited_up = False
        self.left_started_from_down = False
        self.left_reached_up_in_cycle = False
        self.left_descending_to_down = False
        self.left_torso_violation_during_transition = False
        self.right_visited_down = False
        self.right_visited_transition = False
        self.right_visited_up = False
        self.right_started_from_down = False
        self.right_reached_up_in_cycle = False
        self.right_descending_to_down = False
        self.right_torso_violation_during_transition = False
        # Reset raw angles
        self.left_raw_angle = None
        self.right_raw_angle = None
        # Reset torso angle sliding windows
        self.left_torso_angles = []
        self.right_torso_angles = []
        # Reset cycle indices
        self.left_cycle_index = 0
        self.right_cycle_index = 0

        print("Rep counter reset!")


class BicepsCurlTracker:
    """
    Live biceps curl tracking with pose detection
    """
    
    def __init__(self, camera_id=0):
        """
        Initialize biceps curl tracker
        
        Args:
            camera_id: Camera device ID
        """
        self.camera_id = camera_id
        self.cap = None
        self.pose_detector = PoseDetector()
        self.rep_counter = BicepsCurlCounter()
        
        # UI elements
        self.show_instructions = True
        self.show_angles = True
        self.show_skeleton = True
        
        # Performance tracking
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0
        
        # Exercise session tracking
        self.session_start_time = None
        self.session_duration = 0
        
        # CSV logging
        self.csv_enabled = True
        self.csv_rows = []
        self.frame_count = 0
        
        # Visibility tracking for logging
        self._last_left_visible = None
        self._last_right_visible = None
        
    
    def start_camera(self):
        """
        Start camera capture
        
        Returns:
            bool: Success status
        """
        self.cap = cv2.VideoCapture(self.camera_id)
        
        if not self.cap.isOpened():
            print(f"Error: Could not open camera {self.camera_id}")
            return False
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 540)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        print(f"Camera {self.camera_id} started successfully")
        return True
    
    def run(self):
        """
        Main tracking loop
        """
        if not self.start_camera():
            return
        
        print("Biceps Curl Tracker Started!")
        print("Controls:")
        print("  'q' - Quit")
        print("  'r' - Reset rep counter")
        print("  'i' - Toggle instructions")
        print("  'a' - Toggle angle display")
        print("  's' - Toggle skeleton display")
        print("  'd' - Toggle debug mode")
        print("  'space' - Save screenshot")
        
        self.session_start_time = time.time()
        
        while True:
            ret, frame = self.cap.read()
            
            if not ret:
                print("Error: Failed to read frame")
                break
            
            # Flip frame for mirror effect
            frame = cv2.flip(frame, 1)
            
            # Resize frame if too large for display
            h, w = frame.shape[:2]
            max_width = 1200
            if w > max_width:
                scale = max_width / w
                new_width = int(w * scale)
                new_height = int(h * scale)
                frame = cv2.resize(frame, (new_width, new_height))
            
            # Detect pose
            frame, results = self.pose_detector.detect_pose(frame, draw=self.show_skeleton)
            
            # Process biceps curl if pose detected
            if self.pose_detector.is_pose_detected():
                self._process_biceps_curl(frame)
            
            # Save frame data to CSV (always log, even without pose)
            if self.csv_enabled:
                self._save_frame_to_csv(frame)
            
            # Draw UI elements
            self._draw_ui(frame)
            
            # Update performance metrics
            self._update_fps()
            self.session_duration = time.time() - self.session_start_time
            
            # Show frame
            cv2.imshow('Biceps Curl Tracker', frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                self.rep_counter.reset()
            elif key == ord('i'):
                self.show_instructions = not self.show_instructions
            elif key == ord('a'):
                self.show_angles = not self.show_angles
            elif key == ord('s'):
                self.show_skeleton = not self.show_skeleton
            elif key == ord('d'):
                self.rep_counter.debug_mode = not self.rep_counter.debug_mode
                print(f"Debug mode: {'ON' if self.rep_counter.debug_mode else 'OFF'}")
            elif key == ord(' '):
                self._save_screenshot(frame)
        
        self._end_session()
        self.cleanup()
    
    def _get_torso_angle(self, image_shape, side):
        """
        Torso angle: angle at shoulder between elbow-shoulder-hip.
        Should be < 30° for correct form (elbow stays close to body).
        side: 'left' veya 'right'
        """
        if side == 'left':
            elbow = self.pose_detector.get_landmark_position(13, image_shape)    # LEFT_ELBOW
            shoulder = self.pose_detector.get_landmark_position(11, image_shape) # LEFT_SHOULDER
            hip = self.pose_detector.get_landmark_position(23, image_shape)      # LEFT_HIP
        else:
            elbow = self.pose_detector.get_landmark_position(14, image_shape)     # RIGHT_ELBOW
            shoulder = self.pose_detector.get_landmark_position(12, image_shape) # RIGHT_SHOULDER
            hip = self.pose_detector.get_landmark_position(24, image_shape)       # RIGHT_HIP

        if None in [elbow, shoulder, hip]:
            return 999.0  # Invalid - return high value to mark as violation

        # Calculate angle at shoulder: elbow-shoulder-hip
        angle = self.pose_detector.calculate_angle(elbow, shoulder, hip)
        return float(angle) if angle is not None else 999.0

    def _process_biceps_curl(self, frame):
        """
        Process biceps curl detection and counting
        """
        angles = self.pose_detector.get_body_angles(frame.shape)
        left_arm_angle = angles.get('left_arm')
        right_arm_angle = angles.get('right_arm')

        # Get arm visibility status WITH DEPTH FILTERING
        visibility_status = self.pose_detector.get_arms_visibility_with_depth(
            min_confidence=self.rep_counter.min_landmark_confidence,
            depth_threshold=self.rep_counter.depth_threshold,
            depth_filter_enabled=self.rep_counter.depth_filter_enabled
        )
        
        left_arm_visible = visibility_status['left']['visible']
        right_arm_visible = visibility_status['right']['visible']
        left_confidence = visibility_status['left']['confidence']
        right_confidence = visibility_status['right']['confidence']
        left_depth = visibility_status['left']['depth']
        right_depth = visibility_status['right']['depth']
        left_occluded = visibility_status['left']['occluded']
        right_occluded = visibility_status['right']['occluded']
        
        # Log visibility status changes (only on changes to avoid spam)
        if hasattr(self, '_last_left_visible'):
            if self._last_left_visible != left_arm_visible:
                if left_arm_visible:
                    print(f"✓ Sol kol artık görünüyor (güven: {left_confidence*100:.0f}%, depth: {left_depth:.3f})")
                else:
                    reason = visibility_status['left']['occlusion_reason']
                    if left_occluded:
                        print(f"⚠ Sol kol {reason}")
                    else:
                        print(f"⚠ Sol kol net görünmüyor (güven: {left_confidence*100:.0f}%, depth: {left_depth:.3f})")
        if hasattr(self, '_last_right_visible'):
            if self._last_right_visible != right_arm_visible:
                if right_arm_visible:
                    print(f"✓ Sağ kol artık görünüyor (güven: {right_confidence*100:.0f}%, depth: {right_depth:.3f})")
                else:
                    reason = visibility_status['right']['occlusion_reason']
                    if right_occluded:
                        print(f"⚠ Sağ kol {reason}")
                    else:
                        print(f"⚠ Sağ kol net görünmüyor (güven: {right_confidence*100:.0f}%, depth: {right_depth:.3f})")
        
        self._last_left_visible = left_arm_visible
        self._last_right_visible = right_arm_visible

        # Alignment
        left_alignment = self._check_arm_alignment(frame.shape, 'left')
        right_alignment = self._check_arm_alignment(frame.shape, 'right')

        # Torso açıları (dikeyden sapma)
        left_torso_angle = self._get_torso_angle(frame.shape, 'left')
        right_torso_angle = self._get_torso_angle(frame.shape, 'right')

        # Rep counter (artık visibility bilgisi de geçiyor)
        status = self.rep_counter.update(
            left_arm_angle, right_arm_angle,
            left_alignment, right_alignment,
            left_torso_angle=left_torso_angle,
            right_torso_angle=right_torso_angle,
            left_arm_visible=left_arm_visible,
            right_arm_visible=right_arm_visible,
            left_confidence=left_confidence,
            right_confidence=right_confidence
        )

        # Açılar UI
        if self.show_angles and left_arm_angle is not None:
            self._draw_angle_indicator(frame, 'left', left_arm_angle,
                                       status['left_state'], status['left_alignment_warning'])
        if self.show_angles and right_arm_angle is not None:
            self._draw_angle_indicator(frame, 'right', right_arm_angle,
                                       status['right_state'], status['right_alignment_warning'])
    
    def _check_arm_alignment(self, image_shape, arm):
        """
        Check if arm is aligned parallel to torso (vertical)
        
        Args:
            image_shape: Shape of the image
            arm: 'left' or 'right'
            
        Returns:
            bool: True if arm is properly aligned, False otherwise
        """
        # Get relevant landmarks
        if arm == 'left':
            shoulder = self.pose_detector.get_landmark_position(11, image_shape)  # LEFT_SHOULDER
            elbow = self.pose_detector.get_landmark_position(13, image_shape)     # LEFT_ELBOW
            hip = self.pose_detector.get_landmark_position(23, image_shape)       # LEFT_HIP
        else:
            shoulder = self.pose_detector.get_landmark_position(12, image_shape)  # RIGHT_SHOULDER
            elbow = self.pose_detector.get_landmark_position(14, image_shape)     # RIGHT_ELBOW
            hip = self.pose_detector.get_landmark_position(24, image_shape)       # RIGHT_HIP
        
        if None in [shoulder, elbow, hip]:
            return True  # Can't check, assume OK
        
        # Calculate horizontal distance of elbow from shoulder
        elbow_x_offset = abs(elbow[0] - shoulder[0])
        
        # Calculate torso width for reference
        torso_height = abs(hip[1] - shoulder[1])
        
        if torso_height == 0:
            return True
        
        # Elbow should be within 20% of shoulder width from vertical line
        # (allowing some natural deviation)
        max_deviation = torso_height * 0.15
        
        is_aligned = elbow_x_offset < max_deviation
        
        return is_aligned
    
    def _draw_angle_indicator(self, frame, arm, angle, state, alignment_warning=False):
        """
        Draw angle indicator for arm
        
        Args:
            frame: Current video frame
            arm: 'left' or 'right'
            angle: Arm angle in degrees
            state: Current arm state
            alignment_warning: Whether to show alignment warning
        """
        h, w = frame.shape[:2]
        
        # Position for text (adjusted for smaller display)
        if arm == 'left':
            x, y = 40, h - 120
        else:
            x, y = w - 250, h - 120
        
        # Color based on state, but red if alignment warning
        if alignment_warning:
            color = (0, 0, 255)  # Red for misalignment
        else:
            color_map = {
                'up': (0, 255, 0),      # Green
                'down': (255, 0, 0),    # Blue
                'transition': (0, 255, 255),  # Yellow
                'unknown': (128, 128, 128)    # Gray
            }
            color = color_map.get(state, (255, 255, 255))
        
        # Draw angle arc (simplified representation) - smaller
        center_x, center_y = x + 80, y + 35
        radius = 30
        
        # Calculate arc angle (0-180 degrees mapped to angle)
        arc_angle = min(180, max(0, 180 - angle))
        end_x = int(center_x + radius * np.cos(np.radians(arc_angle)))
        end_y = int(center_y - radius * np.sin(np.radians(arc_angle)))
        
        # Draw arc background
        cv2.circle(frame, (center_x, center_y), radius, (50, 50, 50), 2)
        
        # Draw current angle line
        cv2.line(frame, (center_x, center_y), (end_x, end_y), color, 3)
        
        # Draw text (smaller)
        cv2.putText(frame, f'{arm.upper()} ARM', (x, y - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f'{angle:.1f}°', (x, y + 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.putText(frame, f'{state.upper()}', (x, y + 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        
        # Show threshold indicators
        if angle <= self.rep_counter.angle_threshold_up:
            cv2.putText(frame, '▲ UP', (x + 100, y + 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 2)
        elif angle >= self.rep_counter.angle_threshold_down:
            cv2.putText(frame, '▼ DOWN', (x + 100, y + 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 2)
    
    def _draw_ui(self, frame):
        """
        Draw UI elements on frame
        
        Args:
            frame: Current video frame
        """
        h, w = frame.shape[:2]
        status = self.rep_counter.get_status()
        
        # Draw background rectangle for main info (smaller)
        cv2.rectangle(frame, (10, 10), (400, 220), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (400, 220), (255, 255, 255), 2)
        
        # Rep counter info (smaller font sizes)
        cv2.putText(frame, 'BICEPS CURL TRACKER', (20, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        cv2.putText(frame, f'Total Reps: {status["total_reps"]}', (20, 55), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Show correct vs incorrect breakdown
        total_correct = status["left_correct_reps"] + status["right_correct_reps"]
        total_incorrect = status["left_incorrect_reps"] + status["right_incorrect_reps"]
        cv2.putText(frame, f'✓ Correct: {total_correct} | ✗ Incorrect: {total_incorrect}', (20, 75), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        
        cv2.putText(frame, f'Left: {status["left_reps"]} (✓{status["left_correct_reps"]}/✗{status["left_incorrect_reps"]})', (20, 95), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        cv2.putText(frame, f'Right: {status["right_reps"]} (✓{status["right_correct_reps"]}/✗{status["right_incorrect_reps"]})', (20, 110), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Alignment warnings
        y_pos = 135
        
        # Visibility warnings (higher priority than alignment)
        if status.get('left_visibility_message'):
            cv2.putText(frame, status['left_visibility_message'], (20, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)  # Orange
            y_pos += 15
        
        if status.get('right_visibility_message'):
            cv2.putText(frame, status['right_visibility_message'], (20, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)  # Orange
            y_pos += 15
        
        # Show confidence scores if both arms visible
        if status.get('left_arm_visible') and status.get('right_arm_visible'):
            left_conf = status.get('left_avg_confidence', 0) * 100
            right_conf = status.get('right_avg_confidence', 0) * 100
            cv2.putText(frame, f'✓ Kollar görünüyor (L:{left_conf:.0f}% R:{right_conf:.0f}%)', 
                       (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 0), 1)
            y_pos += 15
        
        # Alignment warnings (if arms are visible)
        if status.get('left_arm_visible') and status.get('left_alignment_warning', False):
            cv2.putText(frame, '⚠ Left arm not parallel', (20, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            y_pos += 15
        
        if status.get('right_arm_visible') and status.get('right_alignment_warning', False):
            cv2.putText(frame, '⚠ Right arm not parallel', (20, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            y_pos += 15
        
        if (status.get('left_arm_visible') and not status.get('left_alignment_warning', False) and 
            status.get('right_arm_visible') and not status.get('right_alignment_warning', False)):
            cv2.putText(frame, '✓ Good alignment', (20, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            y_pos += 15
        
        # Session info
        minutes = int(self.session_duration // 60)
        seconds = int(self.session_duration % 60)
        cv2.putText(frame, f'Time: {minutes:02d}:{seconds:02d}', (20, 155), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        
        cv2.putText(frame, f'FPS: {self.current_fps:.1f}', (20, 175), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        
        # Show angle thresholds
        cv2.putText(frame, f'Up: <{self.rep_counter.angle_threshold_up}° | Down: >{self.rep_counter.angle_threshold_down}°', 
                   (20, 195), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (100, 200, 255), 1)

        # Last rep reason(s)
        reasons_y = 210
        left_reasons = status.get('left_last_rep_reasons', [])
        right_reasons = status.get('right_last_rep_reasons', [])
        if left_reasons or right_reasons:
            cv2.rectangle(frame, (10, reasons_y - 10), (390, reasons_y + 80), (0, 0, 255), 1)
            cv2.putText(frame, 'Last rep issues:', (20, reasons_y + 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            for i, r in enumerate(left_reasons[:2]):  # 2 satırla sınırlı tut
                cv2.putText(frame, f'L: {r[:35]}', (20, reasons_y + 12*(i+1) + 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
            base = reasons_y + 12*(len(left_reasons[:2])+1) + 10
            for i, r in enumerate(right_reasons[:2]):
                cv2.putText(frame, f'R: {r[:35]}', (20, base + 12*i),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
        
        # Instructions
        if self.show_instructions:
            instructions = [
                "INSTRUCTIONS:",
                "1. Face camera",
                "2. Arms visible",
                "3. Keep arms parallel",
                "4. Curl up/down",
                "",
                "CONTROLS:",
                "'q'-Quit 'r'-Reset",
                "'d'-Debug 'a'-Angles",
            ]
            
            start_y = h - len(instructions) * 22 - 15
            cv2.rectangle(frame, (w - 250, start_y - 10), (w - 10, h - 10), (0, 0, 0), -1)
            cv2.rectangle(frame, (w - 250, start_y - 10), (w - 10, h - 10), (255, 255, 255), 2)
            
            for i, instruction in enumerate(instructions):
                color = (0, 255, 255) if instruction.endswith(":") else (255, 255, 255)
                cv2.putText(frame, instruction, (w - 240, start_y + i * 22), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1)
        
        # Status indicator
        status_color = (0, 255, 0) if status['is_active'] else (0, 0, 255)
        status_text = "TRACKING" if status['is_active'] else "NO POSE"
        cv2.putText(frame, status_text, (w - 130, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 2)
    
    def _update_fps(self):
        """Update FPS calculation"""
        self.fps_counter += 1
        if self.fps_counter >= 30:
            end_time = time.time()
            self.current_fps = self.fps_counter / (end_time - self.fps_start_time)
            self.fps_counter = 0
            self.fps_start_time = end_time
    
    def _save_screenshot(self, frame):
        """Save screenshot with timestamp"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"biceps_curl_{timestamp}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Screenshot saved: {filename}")
    
    def _save_frame_to_csv(self, frame):
        """Save frame data to CSV rows"""
        h, w = frame.shape[:2]
        
        # Get angles
        angles = self.pose_detector.get_body_angles(frame.shape)
        left_arm_angle = angles.get('left_arm')
        right_arm_angle = angles.get('right_arm')
        
        # Get alignment
        left_alignment = self._check_arm_alignment(frame.shape, 'left')
        right_alignment = self._check_arm_alignment(frame.shape, 'right')
        
        # Get torso angles
        left_torso_angle = self._get_torso_angle(frame.shape, 'left')
        right_torso_angle = self._get_torso_angle(frame.shape, 'right')
        
        # Get status
        status = self.rep_counter.get_status()
        
        # Calculate time since session start
        elapsed_time = time.time() - self.session_start_time if self.session_start_time else 0
        
        # Save row with both raw and smoothed angles
        row = {
            'frame': self.frame_count,
            'time_s': round(elapsed_time, 3),
            'left_cycle_index': status.get('left_cycle_index', 0),
            'right_cycle_index': status.get('right_cycle_index', 0),
            'left_state': status.get('left_state', 'unknown'),
            'right_state': status.get('right_state', 'unknown'),
            'left_angle_raw_deg': round(status.get('left_raw_angle'), 2) if status.get('left_raw_angle') is not None else '',
            'right_angle_raw_deg': round(status.get('right_raw_angle'), 2) if status.get('right_raw_angle') is not None else '',
            'left_angle_smoothed_deg': round(status.get('left_smoothed_angle'), 2) if status.get('left_smoothed_angle') is not None else '',
            'right_angle_smoothed_deg': round(status.get('right_smoothed_angle'), 2) if status.get('right_smoothed_angle') is not None else '',
            'left_torso_angle_deg': round(left_torso_angle, 2) if left_torso_angle is not None else '',
            'right_torso_angle_deg': round(right_torso_angle, 2) if right_torso_angle is not None else '',
            'left_aligned': int(bool(left_alignment)),
            'right_aligned': int(bool(right_alignment)),
            'left_arm_visible': int(status.get('left_arm_visible', False)),
            'right_arm_visible': int(status.get('right_arm_visible', False)),
            'left_avg_confidence': round(status.get('left_avg_confidence', 0.0), 3),
            'right_avg_confidence': round(status.get('right_avg_confidence', 0.0), 3),
            'left_reps': status.get('left_reps', 0),
            'right_reps': status.get('right_reps', 0),
            'left_correct_reps': status.get('left_correct_reps', 0),
            'right_correct_reps': status.get('right_correct_reps', 0),
            'left_incorrect_reps': status.get('left_incorrect_reps', 0),
            'right_incorrect_reps': status.get('right_incorrect_reps', 0),
            'total_reps': status.get('total_reps', 0),
            'left_last_rep_reasons': '; '.join(status.get('left_last_rep_reasons', [])),
            'right_last_rep_reasons': '; '.join(status.get('right_last_rep_reasons', []))
        }
        self.csv_rows.append(row)
        self.frame_count += 1
    
    def _write_csv(self):
        """Write CSV file with session data"""
        if not self.csv_rows:
            print("No data to save to CSV")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"biceps_curl_session_{timestamp}.csv"
        
        fieldnames = list(self.csv_rows[0].keys())
        with open(filename, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in self.csv_rows:
                writer.writerow(row)
        
        print(f"\nCSV saved: {filename}")
        print(f"Total frames logged: {len(self.csv_rows)}")
    
    def _end_session(self):
        """End session and show summary"""
        status = self.rep_counter.get_status()
        minutes = int(self.session_duration // 60)
        seconds = int(self.session_duration % 60)
        
        # Write CSV file
        if self.csv_enabled and self.csv_rows:
            self._write_csv()
        
        print("\n" + "="*50)
        print("BICEPS CURL SESSION SUMMARY")
        print("="*50)
        print(f"Duration: {minutes:02d}:{seconds:02d}")
        print(f"Total Reps: {status['total_reps']}")
        print(f"Correct Reps: {status['left_correct_reps'] + status['right_correct_reps']}")
        print(f"Incorrect Reps: {status['left_incorrect_reps'] + status['right_incorrect_reps']}")
        print(f"Left Arm: {status['left_reps']} reps (✓{status['left_correct_reps']}/✗{status['left_incorrect_reps']})")
        print(f"Right Arm: {status['right_reps']} reps (✓{status['right_correct_reps']}/✗{status['right_incorrect_reps']})")
        if status['total_reps'] > 0:
            reps_per_minute = status['total_reps'] / (self.session_duration / 60)
            print(f"Average Pace: {reps_per_minute:.1f} reps/minute")
        print("="*50)
    
    def cleanup(self):
        """Clean up resources"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        self.pose_detector.close()


if __name__ == "__main__":
    tracker = BicepsCurlTracker(camera_id=0)
    tracker.run()
