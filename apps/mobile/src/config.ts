// Production server on Render
//export const API_URL = 'https://gym-buddy-api.onrender.com';
// Local development server 
export const API_URL = 'http://10.141.233.239:5000';
// export const API_URL = 'http://192.168.x.x:5000';     

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
