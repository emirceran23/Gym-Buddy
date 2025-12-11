/**
 * Biceps Curl Counter - TypeScript port of GymBuddy's counting logic
 * Tracks reps, validates form, and provides feedback
 */

export interface RepStatus {
    leftReps: number;
    rightReps: number;
    leftCorrectReps: number;
    rightCorrectReps: number;
    leftIncorrectReps: number;
    rightIncorrectReps: number;
    totalReps: number;
    leftState: 'unknown' | 'down' | 'transition' | 'up';
    rightState: 'unknown' | 'down' | 'transition' | 'up';
    leftAlignmentWarning: boolean;
    rightAlignmentWarning: boolean;
    leftLastRepReasons: string[];
    rightLastRepReasons: string[];
    leftRawAngle: number | null;
    rightRawAngle: number | null;
}

export class BicepsCurlCounter {
    // Thresholds
    private angleThresholdDown = 160; // Arm extended
    private angleThresholdUp = 50;    // Arm curled
    private torsoAngleThreshold = 30; // Max torso deviation
    private minHoldTime = 0.2;        // Minimum time in state

    // Rep counts
    private leftReps = 0;
    private rightReps = 0;
    private leftCorrectReps = 0;
    private rightCorrectReps = 0;
    private leftIncorrectReps = 0;
    private rightIncorrectReps = 0;
    private totalReps = 0;

    // State tracking for left arm
    private leftState: 'unknown' | 'down' | 'transition' | 'up' = 'unknown';
    private leftLastStateTime = Date.now();
    private leftAngleHistory: number[] = [];
    private leftPendingState: string | null = null;
    private leftPendingSince: number | null = null;
    private leftRepIsValid = true;
    private leftInvalidReasons = new Set<string>();
    private leftLastRepReasons: string[] = [];

    // Ordered sequence tracking (left)
    private leftStartedFromDown = false;
    private leftReachedUpInCycle = false;
    private leftDescendingToDown = false;

    // Torso violation tracking (left)
    private leftTorsoAngles: number[] = [];
    private leftTorsoViolation = false;

    // State tracking for right arm
    private rightState: 'unknown' | 'down' | 'transition' | 'up' = 'unknown';
    private rightLastStateTime = Date.now();
    private rightAngleHistory: number[] = [];
    private rightPendingState: string | null = null;
    private rightPendingSince: number | null = null;
    private rightRepIsValid = true;
    private rightInvalidReasons = new Set<string>();
    private rightLastRepReasons: string[] = [];

    // Ordered sequence tracking (right)
    private rightStartedFromDown = false;
    private rightReachedUpInCycle = false;
    private rightDescendingToDown = false;

    // Torso violation tracking (right)
    private rightTorsoAngles: number[] = [];
    private rightTorsoViolation = false;

    // Alignment warnings
    private leftAlignmentWarning = false;
    private rightAlignmentWarning = false;

    // Raw angles
    private leftRawAngle: number | null = null;
    private rightRawAngle: number | null = null;

    private historyLength = 12;

    /**
     * Update counter with new angle data
     */
    update(
        leftArmAngle: number | null,
        rightArmAngle: number | null,
        leftAlignment: boolean,
        rightAlignment: boolean,
        leftTorsoAngle: number = 0,
        rightTorsoAngle: number = 0
    ): RepStatus {
        const currentTime = Date.now();

        this.leftAlignmentWarning = !leftAlignment;
        this.rightAlignmentWarning = !rightAlignment;

        // Store raw angles
        this.leftRawAngle = leftArmAngle;
        this.rightRawAngle = rightArmAngle;

        // Update torso violation tracking
        if (this.leftState !== 'down') {
            this.updateTorsoViolation('left', leftTorsoAngle);
        }
        if (this.rightState !== 'down') {
            this.updateTorsoViolation('right', rightTorsoAngle);
        }

        if (leftArmAngle !== null) {
            this.updateArmState('left', leftArmAngle, leftTorsoAngle, leftAlignment, currentTime);
        }
        if (rightArmAngle !== null) {
            this.updateArmState('right', rightArmAngle, rightTorsoAngle, rightAlignment, currentTime);
        }

        return this.getStatus();
    }

    /**
     * Update torso violation tracking with 3-frame sliding window
     */
    private updateTorsoViolation(side: 'left' | 'right', torsoAngle: number): void {
        const angles = side === 'left' ? this.leftTorsoAngles : this.rightTorsoAngles;

        angles.push(torsoAngle);
        if (angles.length > 3) {
            angles.shift();
        }

        // Check 3-frame average
        if (angles.length === 3) {
            const avgTorso = angles.reduce((a, b) => a + b, 0) / 3;
            if (avgTorso > this.torsoAngleThreshold) {
                if (side === 'left') {
                    this.leftTorsoViolation = true;
                } else {
                    this.rightTorsoViolation = true;
                }
            }
        }
    }

    /**
     * Update state for a specific arm
     */
    private updateArmState(
        arm: 'left' | 'right',
        angle: number,
        torsoAngle: number,
        isAligned: boolean,
        currentTime: number
    ): void {
        // Get current state variables
        const state = arm === 'left' ? this.leftState : this.rightState;
        const history = arm === 'left' ? this.leftAngleHistory : this.rightAngleHistory;
        let pendingState = arm === 'left' ? this.leftPendingState : this.rightPendingState;
        let pendingSince = arm === 'left' ? this.leftPendingSince : this.rightPendingSince;

        // Smoothing
        history.push(angle);
        if (history.length > this.historyLength) {
            history.shift();
        }
        const smoothedAngle = history.reduce((a, b) => a + b, 0) / history.length;

        // Determine proposed state based on angle
        let proposed: 'down' | 'transition' | 'up';
        if (angle > this.angleThresholdDown) {
            proposed = 'down';
        } else if (angle < this.angleThresholdUp) {
            proposed = 'up';
        } else {
            proposed = 'transition';
        }

        // Dwell time logic
        let commit = false;
        if (proposed === state) {
            pendingState = null;
            pendingSince = null;
        } else {
            if (pendingState === proposed) {
                if (pendingSince && (currentTime - pendingSince) >= this.minHoldTime * 1000) {
                    commit = true;
                }
            } else {
                pendingState = proposed;
                pendingSince = currentTime;
            }
        }

        // Save pending state
        if (arm === 'left') {
            this.leftPendingState = pendingState;
            this.leftPendingSince = pendingSince;
        } else {
            this.rightPendingState = pendingState;
            this.rightPendingSince = pendingSince;
        }

        // Commit state change
        if (commit) {
            this.handleStateChange(arm, state, proposed, angle);
        }
    }

    /**
     * Handle state changes and rep counting
     */
    private handleStateChange(
        arm: 'left' | 'right',
        oldState: string,
        newState: 'down' | 'transition' | 'up',
        angle: number
    ): void {
        // Track state progression
        if (arm === 'left') {
            if (oldState === 'down' && (newState === 'transition' || newState === 'up')) {
                // Starting a new rep
                this.leftStartedFromDown = true;
                this.leftReachedUpInCycle = false;
                this.leftDescendingToDown = false;
                this.leftRepIsValid = true;
                this.leftInvalidReasons.clear();
                this.leftTorsoAngles = [];
                this.leftTorsoViolation = false;
            }

            if (newState === 'up' && this.leftStartedFromDown) {
                this.leftReachedUpInCycle = true;
            }

            if (oldState === 'up' && newState === 'transition' && this.leftReachedUpInCycle) {
                this.leftDescendingToDown = true;
            }

            // Rep completion: returning to DOWN
            if ((oldState === 'up' || oldState === 'transition') && newState === 'down') {
                this.completeRep('left');
            }

            this.leftState = newState;
            this.leftLastStateTime = Date.now();
        } else {
            if (oldState === 'down' && (newState === 'transition' || newState === 'up')) {
                this.rightStartedFromDown = true;
                this.rightReachedUpInCycle = false;
                this.rightDescendingToDown = false;
                this.rightRepIsValid = true;
                this.rightInvalidReasons.clear();
                this.rightTorsoAngles = [];
                this.rightTorsoViolation = false;
            }

            if (newState === 'up' && this.rightStartedFromDown) {
                this.rightReachedUpInCycle = true;
            }

            if (oldState === 'up' && newState === 'transition' && this.rightReachedUpInCycle) {
                this.rightDescendingToDown = true;
            }

            if ((oldState === 'up' || oldState === 'transition') && newState === 'down') {
                this.completeRep('right');
            }

            this.rightState = newState;
            this.rightLastStateTime = Date.now();
        }
    }

    /**
     * Complete a rep and validate form
     */
    private completeRep(arm: 'left' | 'right'): void {
        const startedFromDown = arm === 'left' ? this.leftStartedFromDown : this.rightStartedFromDown;
        const reachedUp = arm === 'left' ? this.leftReachedUpInCycle : this.rightReachedUpInCycle;
        const descendingToDown = arm === 'left' ? this.leftDescendingToDown : this.rightDescendingToDown;
        const torsoViolation = arm === 'left' ? this.leftTorsoViolation : this.rightTorsoViolation;
        const invalidReasons = arm === 'left' ? this.leftInvalidReasons : this.rightInvalidReasons;

        let repIsValid = true;

        // Validate rep sequence
        if (!startedFromDown || !reachedUp || !descendingToDown) {
            repIsValid = false;
            invalidReasons.add('Incomplete rep cycle');
        }

        // Check torso violation
        if (torsoViolation) {
            repIsValid = false;
            invalidReasons.add(`Torso swung too much (>${this.torsoAngleThreshold}°)`);
        }

        // Count the rep if sequence is complete
        if (startedFromDown && reachedUp && descendingToDown) {
            this.totalReps++;

            if (arm === 'left') {
                this.leftReps++;
                if (repIsValid) {
                    this.leftCorrectReps++;
                } else {
                    this.leftIncorrectReps++;
                }
                this.leftLastRepReasons = Array.from(invalidReasons);
                this.leftRepIsValid = repIsValid;

                // Log rep
                console.log(repIsValid ? '✓ Left rep CORRECT' : `↪ Left rep INCORRECT: ${Array.from(invalidReasons).join('; ')}`);
            } else {
                this.rightReps++;
                if (repIsValid) {
                    this.rightCorrectReps++;
                } else {
                    this.rightIncorrectReps++;
                }
                this.rightLastRepReasons = Array.from(invalidReasons);
                this.rightRepIsValid = repIsValid;

                console.log(repIsValid ? '✓ Right rep CORRECT' : `↪ Right rep INCORRECT: ${Array.from(invalidReasons).join('; ')}`);
            }
        }

        // Reset progression flags
        if (arm === 'left') {
            this.leftStartedFromDown = false;
            this.leftReachedUpInCycle = false;
            this.leftDescendingToDown = false;
        } else {
            this.rightStartedFromDown = false;
            this.rightReachedUpInCycle = false;
            this.rightDescendingToDown = false;
        }
    }

    /**
     * Get current status
     */
    getStatus(): RepStatus {
        return {
            leftReps: this.leftReps,
            rightReps: this.rightReps,
            leftCorrectReps: this.leftCorrectReps,
            rightCorrectReps: this.rightCorrectReps,
            leftIncorrectReps: this.leftIncorrectReps,
            rightIncorrectReps: this.rightIncorrectReps,
            totalReps: this.totalReps,
            leftState: this.leftState,
            rightState: this.rightState,
            leftAlignmentWarning: this.leftAlignmentWarning,
            rightAlignmentWarning: this.rightAlignmentWarning,
            leftLastRepReasons: this.leftLastRepReasons,
            rightLastRepReasons: this.rightLastRepReasons,
            leftRawAngle: this.leftRawAngle,
            rightRawAngle: this.rightRawAngle,
        };
    }

    /**
     * Reset counter
     */
    reset(): void {
        this.leftReps = 0;
        this.rightReps = 0;
        this.leftCorrectReps = 0;
        this.rightCorrectReps = 0;
        this.leftIncorrectReps = 0;
        this.rightIncorrectReps = 0;
        this.totalReps = 0;

        this.leftState = 'unknown';
        this.rightState = 'unknown';
        this.leftAngleHistory = [];
        this.rightAngleHistory = [];

        this.leftRepIsValid = true;
        this.rightRepIsValid = true;
        this.leftInvalidReasons.clear();
        this.rightInvalidReasons.clear();
        this.leftLastRepReasons = [];
        this.rightLastRepReasons = [];

        this.leftStartedFromDown = false;
        this.leftReachedUpInCycle = false;
        this.leftDescendingToDown = false;
        this.rightStartedFromDown = false;
        this.rightReachedUpInCycle = false;
        this.rightDescendingToDown = false;

        this.leftTorsoAngles = [];
        this.rightTorsoAngles = [];
        this.leftTorsoViolation = false;
        this.rightTorsoViolation = false;

        console.log('🔄 Rep counter reset');
    }
}

export default BicepsCurlCounter;
