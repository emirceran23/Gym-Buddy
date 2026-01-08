import { API_ENDPOINTS } from '../config';

export interface ProcessingResult {
    jobId?: string;  // Job ID for progress tracking
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
    formScore?: number;          // ML-based form score (0-100)
    formLabel?: string;
    timeline: any[];
    duration: number;
    annotatedVideoUrl?: string;  // URL to annotated video with pose overlay
}

export interface ProcessingProgress {
    current: number;
    total: number;
    percentage: number;
    status: string;
}

/**
 * Video processor that uploads to backend server for analysis
 */
export class VideoProcessor {
    private onProgress?: (progress: ProcessingProgress) => void;

    constructor(onProgress?: (progress: ProcessingProgress) => void) {
        this.onProgress = onProgress;
    }

    /**
     * Process a video file by uploading to backend server with real-time progress via SSE
     */
    async processVideo(videoUri: string): Promise<ProcessingResult> {
        return new Promise(async (resolve, reject) => {
            let eventSource: any = null;

            try {
                console.log('🎥 Processing video:', videoUri);
                console.log('🌐 API Endpoint:', API_ENDPOINTS.ANALYZE_VIDEO);

                this.reportProgress(0, 100, 'Preparing video...');

                // Create form data with video file
                const formData = new FormData();

                // In React Native, we need to pass file info differently
                const fileInfo = {
                    uri: videoUri,
                    type: 'video/mp4',
                    name: 'exercise_video.mp4',
                };

                formData.append('video', fileInfo as any);

                this.reportProgress(10, 100, 'Uploading video to server...');

                console.log('📤 Sending POST request to server...');

                // Upload to backend
                const response = await fetch(API_ENDPOINTS.ANALYZE_VIDEO, {
                    method: 'POST',
                    body: formData,
                });

                console.log('📥 Response status:', response.status);

                // Check if response is 202 Accepted (async processing)
                if (response.status === 202) {
                    const asyncResponse = await response.json();
                    const jobId = asyncResponse.jobId;

                    console.log('✅ Video uploaded successfully');
                    console.log('🔄 Job ID received:', jobId);
                    console.log('📡 Starting progress polling...');

                    // Use polling with JSON endpoint
                    const pollProgress = async () => {
                        try {
                            const progressUrl = API_ENDPOINTS.PROGRESS(jobId);
                            const progressResponse = await fetch(progressUrl);

                            if (!progressResponse.ok) {
                                if (progressResponse.status === 404) {
                                    console.log('Job not found yet, retrying...');
                                    return null;
                                }
                                console.error('Failed to fetch progress:', progressResponse.status);
                                return null;
                            }

                            // Direct JSON response (no SSE parsing needed)
                            return await progressResponse.json();
                        } catch (e) {
                            console.error('Poll error:', e);
                            return null;
                        }
                    };

                    // Poll every 300ms
                    const pollingInterval = setInterval(async () => {
                        const progress = await pollProgress();

                        if (!progress) {
                            return;
                        }

                        console.log('📊 Progress update:', progress);

                        if (progress.error) {
                            console.error('❌ Progress error:', progress.error);
                            clearInterval(pollingInterval);
                            reject(new Error(progress.error));
                            return;
                        }

                        // Update progress with real frame counts
                        if (progress.current && progress.total) {
                            this.reportProgress(
                                progress.current,
                                progress.total,
                                `Processed ${progress.current}/${progress.total} frames... (${progress.percentage}%)`
                            );
                        }

                        // When complete, get results and close
                        if (progress.status === 'complete') {
                            console.log('✅ Analysis complete! Fetching results...');
                            clearInterval(pollingInterval);

                            // Results are stored in progress.results
                            const result: ProcessingResult = progress.results || {
                                jobId: jobId,
                                totalReps: 0,
                                correctReps: 0,
                                incorrectReps: 0,
                                leftReps: 0,
                                rightReps: 0,
                                leftCorrectReps: 0,
                                rightCorrectReps: 0,
                                leftIncorrectReps: 0,
                                rightIncorrectReps: 0,
                                formFeedback: [],
                                timeline: [],
                                duration: 0
                            };

                            this.reportProgress(100, 100, 'Complete!');
                            resolve(result);
                        } else if (progress.status === 'error') {
                            console.error('❌ Analysis failed:', progress.error);
                            clearInterval(pollingInterval);
                            reject(new Error(progress.error || 'Analysis failed'));
                        }
                    }, 300); // Poll every 300ms

                    // Timeout after 5 minutes (Render free tier can be slow)
                    setTimeout(() => {
                        clearInterval(pollingInterval);
                        reject(new Error('Analysis timeout'));
                    }, 300000);

                    return; // Don't continue to old sync path
                }

                // Old sync path (fallback for non-async backend)
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Server error occurred');
                }

                const result: ProcessingResult = await response.json();

                if (result.jobId) {
                    console.log('🔄 Job ID received:', result.jobId);
                    console.log('📡 Connecting to SSE for real-time progress...');

                    // Dynamically import react-native-sse
                    const EventSource = require('react-native-sse');

                    // Connect to SSE endpoint
                    const progressUrl = API_ENDPOINTS.PROGRESS(result.jobId);
                    console.log('🌐 SSE URL:', progressUrl);

                    eventSource = new EventSource(progressUrl);

                    eventSource.addEventListener('message', (event: any) => {
                        try {
                            const progress = JSON.parse(event.data);
                            console.log('📊 Progress update:', progress);

                            if (progress.error) {
                                console.error('❌ Progress error:', progress.error);
                                return;
                            }

                            // Update progress with real frame counts
                            this.reportProgress(
                                progress.current,
                                progress.total,
                                `Processed ${progress.current}/${progress.total} frames... (${progress.percentage}%)`
                            );

                            // Close connection when complete
                            if (progress.status === 'complete' || progress.status === 'error') {
                                eventSource.close();
                                resolve(result);
                            }
                        } catch (e) {
                            console.error('Error parsing progress:', e);
                        }
                    });

                    eventSource.addEventListener('error', (error: any) => {
                        console.error('❌ SSE error:', error);
                        if (eventSource) {
                            eventSource.close();
                        }
                        resolve(result);
                    });

                    eventSource.addEventListener('open', () => {
                        console.log('✅ SSE connection opened');
                    });

                } else {
                    // No job ID, just return the result
                    console.log('✅ Video processing complete (no SSE)');
                    this.reportProgress(100, 100, 'Complete!');
                    resolve(result);
                }

            } catch (error) {
                console.error('Error processing video:', error);
                if (eventSource) {
                    eventSource.close();
                }
                reject(error);
            }
        });
    }

    /**
     * Report processing progress
     */
    private reportProgress(current: number, total: number, status: string): void {
        if (this.onProgress) {
            this.onProgress({
                current,
                total,
                percentage: (current / total) * 100,
                status,
            });
        }
    }
}

export default VideoProcessor;
