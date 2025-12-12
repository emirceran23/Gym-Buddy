import { API_URL } from '../config';

export interface SavedExerciseResult {
    id: string;
    timestamp: string;
    originalFilename: string;
    results: {
        totalReps: number;
        correctReps: number;
        incorrectReps: number;
        leftReps: number;
        rightReps: number;
        leftCorrectReps: number;
        rightCorrectReps: number;
        leftIncorrectReps: number;
        rightIncorrectReps: number;
        formFeedback: string[];
        timeline: any[];
        duration: number;
        fps?: number;
        frameCount?: number;
        formScore?: number;     // ML-based form score (0-100)
        formLabel?: string;     // ML prediction label
    };
    hasAnnotatedVideo?: boolean;
    hasTimeline?: boolean;
    annotatedVideoUrl?: string;
    timelineCsvUrl?: string;
}

/**
 * Fetch all saved exercise results
 */
export async function fetchExerciseResults(): Promise<SavedExerciseResult[]> {
    try {
        const response = await fetch(`${API_URL}/api/exercise-results`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching exercise results:', error);
        throw error;
    }
}

/**
 * Fetch a specific exercise result by ID
 */
export async function fetchExerciseResultById(resultId: string): Promise<SavedExerciseResult> {
    try {
        const response = await fetch(`${API_URL}/api/exercise-results/${resultId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching exercise result ${resultId}:`, error);
        throw error;
    }
}

/**
 * Delete a saved exercise result
 */
export async function deleteExerciseResult(resultId: string): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/exercise-results/${resultId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`Deleted exercise result: ${resultId}`);
    } catch (error) {
        console.error(`Error deleting exercise result ${resultId}:`, error);
        throw error;
    }
}
