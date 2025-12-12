// Temporarily using production URL for testing
// Change back to __DEV__ check after testing
export const API_URL = 'https://gym-buddy-api.onrender.com';  // Render production server
// ? 'http://10.2.15.2:5000'  // Local development server
// : 'https://gym-buddy-api.onrender.com';  // Render production server

console.log('🔧 DEV MODE:', __DEV__);
console.log('🌐 API_URL:', API_URL);

export const API_ENDPOINTS = {
    HEALTH: `${API_URL}/api/health`,
    ANALYZE_VIDEO: `${API_URL}/api/analyze-video`,
    PROGRESS: (jobId: string) => `${API_URL}/api/progress-json/${jobId}`,
    GENERATE_MEAL_PLAN: `${API_URL}/api/generate-meal-plan`,
    EXERCISE_RESULTS: `${API_URL}/api/exercise-results`,
    TUTORIALS: `${API_URL}/api/tutorials`,
    TUTORIAL_DETAIL: (id: string) => `${API_URL}/api/tutorials/${id}`,
};
