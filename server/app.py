from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os
import sys
import tempfile
import json
import shutil
import uuid
import threading
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables from .env file (for local development)
load_dotenv()

# Add the scripts and server directories to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
sys.path.insert(0, os.path.dirname(__file__))  # Add server directory for meal_planner_module

from biceps_curl_video_analyzer import BicepsCurlVideoAnalyzer
import meal_planner_module as mpm

app = Flask(__name__)

# Configure CORS for mobile app
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*')
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'exerciseevaluation', 'results')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# In-memory progress tracking store
# Format: {job_id: {'current': 0, 'total': 0, 'status': 'processing'|'complete'|'error', 'error': str}}
progress_store = {}
progress_store_lock = threading.Lock()

# Ensure results directory exists
os.makedirs(RESULTS_DIR, exist_ok=True)

# Azure Blob Storage configuration (optional)
AZURE_STORAGE_ENABLED = os.getenv('AZURE_STORAGE_CONNECTION_STRING') is not None
if AZURE_STORAGE_ENABLED:
    try:
        from azure.storage.blob import BlobServiceClient
        blob_service_client = BlobServiceClient.from_connection_string(
            os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        )
        BLOB_CONTAINER_NAME = 'videos'
        print("✅ Azure Blob Storage configured")
    except Exception as e:
        print(f"⚠️  Azure Blob Storage connection failed: {e}")
        AZURE_STORAGE_ENABLED = False
else:
    print("ℹ️  Running without Azure Blob Storage (local mode)")


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_exercise_result(results, timeline_csv_path, annotated_video_path, original_filename):
    """
    Save exercise analysis results to the results directory.
    
    Args:
        results: Dictionary containing analysis results
        timeline_csv_path: Path to the timeline CSV file
        annotated_video_path: Path to the annotated video file
        original_filename: Original uploaded video filename
    
    Returns:
        result_id: Unique identifier for the saved result
    """
    try:
        # Generate unique result ID using timestamp
        result_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        result_dir = os.path.join(RESULTS_DIR, result_id)
        os.makedirs(result_dir, exist_ok=True)
        
        # Prepare metadata
        metadata = {
            'id': result_id,
            'timestamp': datetime.now().isoformat(),
            'originalFilename': original_filename,
            'results': results,
        }
        
        # Save metadata as JSON
        metadata_path = os.path.join(result_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Copy timeline CSV if it exists
        if timeline_csv_path and os.path.exists(timeline_csv_path):
            dest_csv = os.path.join(result_dir, 'timeline.csv')
            shutil.copy2(timeline_csv_path, dest_csv)
        
        # Copy annotated video if it exists
        if annotated_video_path and os.path.exists(annotated_video_path):
            dest_video = os.path.join(result_dir, 'annotated_video.mp4')
            shutil.copy2(annotated_video_path, dest_video)
        
        print(f"✅ Saved exercise result: {result_id}")
        return result_id
        
    except Exception as e:
        print(f"❌ Error saving exercise result: {e}")
        return None



@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API documentation"""
    return jsonify({
        'name': 'SentriFit Exercise Analysis API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'analyze_video': '/api/analyze-video (POST)',
            'progress': '/api/progress/{job_id} (GET - SSE)',
            'generate_meal_plan': '/api/generate-meal-plan (POST)',
            'list_results': '/api/exercise-results (GET)',
            'get_result': '/api/exercise-results/{id} (GET)',
            'delete_result': '/api/exercise-results/{id} (DELETE)'
        },
        'documentation': 'https://github.com/emirceran23/Gym-Buddy'
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with environment info"""
    environment = 'azure' if os.getenv('WEBSITE_SITE_NAME') else 'local'
    return jsonify({
        'status': 'ok',
        'message': 'SentriFit Exercise Analysis Server',
        'environment': environment,
        'storage': 'azure_blob' if AZURE_STORAGE_ENABLED else 'local'
    })


@app.route('/api/progress/<job_id>', methods=['GET'])
def get_progress(job_id):
    """
    Server-Sent Events (SSE) endpoint for real-time progress updates
    
    Client should connect using EventSource:
        const eventSource = new EventSource(`/api/progress/${jobId}`);
        eventSource.onmessage = (event) => {
            const progress = JSON.parse(event.data);
            console.log(`Processed ${progress.current}/${progress.total} frames`);
        };
    """
    def generate():
        """Generator function for SSE stream"""
        last_current = -1
        
        while True:
            with progress_store_lock:
                job_data = progress_store.get(job_id)
            
            if not job_data:
                # Job not found - send error and close
                yield f"data: {{\"error\": \"Job not found\", \"job_id\": \"{job_id}\"}}\n\n"
                break
            
            # Only send update if progress changed
            current = job_data.get('current', 0)
            if current != last_current or job_data.get('status') in ['complete', 'error']:
                progress_data = {
                    'job_id': job_id,
                    'current': job_data.get('current', 0),
                    'total': job_data.get('total', 0),
                    'status': job_data.get('status', 'processing'),
                    'percentage': round((job_data.get('current', 0) / job_data.get('total', 1)) * 100, 1) if job_data.get('total', 0) > 0 else 0
                }
                
                if job_data.get('status') == 'error':
                    progress_data['error'] = job_data.get('error', 'Unknown error')
                
                yield f"data: {json.dumps(progress_data)}\n\n"
                last_current = current
            
            # Close stream if job is done
            if job_data.get('status') in ['complete', 'error']:
                break
            
            # Small delay to avoid hammering
            import time
            time.sleep(0.1)
    
    return Response(generate(), mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no',  # Disable nginx buffering
                        'Connection': 'keep-alive'
                    })


@app.route('/api/progress-json/<job_id>', methods=['GET'])
def get_progress_json(job_id):
    """
    Simple JSON endpoint for polling progress (no SSE streaming)
    Returns current progress state directly
    """
    with progress_store_lock:
        job_data = progress_store.get(job_id)
    
    if not job_data:
        return jsonify({
            'error': 'Job not found',
            'job_id': job_id
        }), 404
    
    progress_data = {
        'job_id': job_id,
        'current': job_data.get('current', 0),
        'total': job_data.get('total', 0),
        'status': job_data.get('status', 'processing'),
        'percentage': round((job_data.get('current', 0) / job_data.get('total', 1)) * 100, 1) if job_data.get('total', 0) > 0 else 0
    }
    
    if job_data.get('status') == 'error':
        progress_data['error'] = job_data.get('error', 'Unknown error')
    
    if job_data.get('status') == 'complete' and job_data.get('results'):
        progress_data['results'] = job_data.get('results')
    
    return jsonify(progress_data), 200


@app.route('/api/analyze-video', methods=['POST'])
def analyze_video():
    """
    Analyze uploaded video for biceps curl form and reps
    
    Expects:
        - 'video' file in multipart/form-data
    
    Returns:
        JSON with analysis results + annotated video URL
    """
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        if not allowed_file(video_file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: mp4, mov, avi, webm'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(video_file.filename)
        temp_video_path = os.path.join(app.config['UPLOAD_FOLDER'], f'upload_{os.getpid()}_{filename}')
        video_file.save(temp_video_path)
        
        # Generate unique job ID for progress tracking
        job_id = str(uuid.uuid4())
        
        print(f"📹 Processing video: {filename} (job_id: {job_id})")
        
        # Initialize progress tracking
        with progress_store_lock:
            progress_store[job_id] = {
                'current': 0,
                'total': 0,
                'status': 'processing'
            }
        
        # Create output directory for annotated videos
        output_dir = os.path.join(os.path.dirname(__file__), 'static', 'videos')
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Progress callback to update progress store
            def update_progress(current, total):
                with progress_store_lock:
                    if job_id in progress_store:
                        progress_store[job_id]['current'] = current
                        progress_store[job_id]['total'] = total
            
            # Function to run analysis in background
            def run_analysis():
                try:
                    # Create analyzer with visualization and progress callback
                    analyzer = BicepsCurlVideoAnalyzer(
                        video_path=temp_video_path,
                        visualize=True,
                        output_dir=output_dir,
                        progress_callback=update_progress
                    )
                    
                    # Run analysis
                    analyzer.analyze()
                    
                    # Get results as dictionary
                    results = analyzer.get_results_dict()
                    
                    # Get annotated video filename
                    temp_base = os.path.splitext(os.path.basename(temp_video_path))[0]
                    annotated_filename = f"{temp_base}__annotated.mp4"
                    annotated_video_path = os.path.join(output_dir, annotated_filename)
                    timeline_csv_path = os.path.join(output_dir, f"{temp_base}__timeline.csv")
                    
                    # Verify the file was actually created
                    if not os.path.exists(annotated_video_path):
                        print(f"⚠️  Warning: Annotated video not found at {annotated_video_path}")
                        results['annotatedVideoUrl'] = None
                    else:
                        results['annotatedVideoUrl'] = f"/static/videos/{annotated_filename}"
                        print(f"✅ Annotated video saved: {annotated_filename}")
                    
                    # Save results to exerciseevaluation/results directory
                    result_id = save_exercise_result(
                        results=results,
                        timeline_csv_path=timeline_csv_path,
                        annotated_video_path=annotated_video_path,
                        original_filename=filename
                    )
                    
                    if result_id:
                        results['savedResultId'] = result_id
                    
                    # Store results in progress store for retrieval
                    with progress_store_lock:
                        if job_id in progress_store:
                            progress_store[job_id]['results'] = results
                            progress_store[job_id]['status'] = 'complete'
                    
                    print(f"✅ Analysis complete: {results['totalReps']} total reps (job_id: {job_id})")
                    
                except Exception as e:
                    print(f"❌ Error in background analysis: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    
                    with progress_store_lock:
                        if job_id in progress_store:
                            progress_store[job_id]['status'] = 'error'
                            progress_store[job_id]['error'] = str(e)
                
                finally:
                    # Cleanup: remove temporary uploaded video file
                    if os.path.exists(temp_video_path):
                        os.remove(temp_video_path)
                        print(f"🧹 Cleaned up temporary upload file")
                    
                    # Force garbage collection to free memory
                    import gc
                    gc.collect()
                    print(f"🧹 Memory cleanup complete")
                    
                    # Schedule job removal from progress_store after 5 minutes
                    def cleanup_job():
                        import time
                        time.sleep(300)  # Wait 5 minutes
                        with progress_store_lock:
                            if job_id in progress_store:
                                del progress_store[job_id]
                                print(f"🧹 Cleaned up job from progress store: {job_id}")
                    
                    cleanup_thread = threading.Thread(target=cleanup_job)
                    cleanup_thread.daemon = True
                    cleanup_thread.start()
            
            # Start analysis in background thread
            analysis_thread = threading.Thread(target=run_analysis)
            analysis_thread.start()
            
            # Return jobId immediately so client can connect to SSE
            # NOTE: Cleanup happens inside the background thread, not here
            return jsonify({
                'jobId': job_id,
                'status': 'processing',
                'message': 'Video analysis started. Connect to /api/progress/{jobId} for real-time updates.'
            }), 202  # 202 Accepted
            
        except Exception as e:
            # Cleanup temp file on error
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
                print(f"🧹 Cleaned up temporary upload file after error")
            raise e
    
    except Exception as e:
        # Mark progress as error
        try:
            if 'job_id' in locals():
                with progress_store_lock:
                    if job_id in progress_store:
                        progress_store[job_id]['status'] = 'error'
                        progress_store[job_id]['error'] = str(e)
        except:
            pass
        
        print(f"❌ Error processing video: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to process video',
            'details': str(e)
        }), 500


@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    """Serve annotated video files"""
    video_dir = os.path.join(os.path.dirname(__file__), 'static', 'videos')
    return send_from_directory(video_dir, filename)


@app.route('/api/exercise-results', methods=['GET'])
def list_exercise_results():
    """
    List all saved exercise results
    
    Returns:
        JSON array of saved results with metadata
    """
    try:
        results_list = []
        
        # Check if results directory exists
        if not os.path.exists(RESULTS_DIR):
            return jsonify([]), 200
        
        # Iterate through all result directories
        for result_id in os.listdir(RESULTS_DIR):
            result_dir = os.path.join(RESULTS_DIR, result_id)
            
            # Skip if not a directory
            if not os.path.isdir(result_dir):
                continue
            
            # Read metadata.json
            metadata_path = os.path.join(result_dir, 'metadata.json')
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Add preview info
                    metadata['hasAnnotatedVideo'] = os.path.exists(os.path.join(result_dir, 'annotated_video.mp4'))
                    metadata['hasTimeline'] = os.path.exists(os.path.join(result_dir, 'timeline.csv'))
                    
                    results_list.append(metadata)
                except Exception as e:
                    print(f"⚠️  Error reading metadata for {result_id}: {e}")
                    continue
        
        # Sort by timestamp (newest first)
        results_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify(results_list), 200
        
    except Exception as e:
        print(f"❌ Error listing exercise results: {e}")
        return jsonify({'error': 'Failed to list results', 'details': str(e)}), 500


@app.route('/api/exercise-results/<result_id>', methods=['GET'])
def get_exercise_result(result_id):
    """
    Get a specific exercise result by ID
    
    Args:
        result_id: Unique identifier for the result
    
    Returns:
        JSON with result metadata and file URLs
    """
    try:
        result_dir = os.path.join(RESULTS_DIR, result_id)
        
        # Check if result exists
        if not os.path.exists(result_dir):
            return jsonify({'error': 'Result not found'}), 404
        
        # Read metadata
        metadata_path = os.path.join(result_dir, 'metadata.json')
        if not os.path.exists(metadata_path):
            return jsonify({'error': 'Result metadata not found'}), 404
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Add file URLs
        if os.path.exists(os.path.join(result_dir, 'annotated_video.mp4')):
            metadata['annotatedVideoUrl'] = f'/api/exercise-results/{result_id}/video'
        
        if os.path.exists(os.path.join(result_dir, 'timeline.csv')):
            metadata['timelineCsvUrl'] = f'/api/exercise-results/{result_id}/timeline'
        
        return jsonify(metadata), 200
        
    except Exception as e:
        print(f"❌ Error getting exercise result {result_id}: {e}")
        return jsonify({'error': 'Failed to get result', 'details': str(e)}), 500


@app.route('/api/exercise-results/<result_id>', methods=['DELETE'])
def delete_exercise_result(result_id):
    """
    Delete a saved exercise result
    
    Args:
        result_id: Unique identifier for the result
    
    Returns:
        Success message
    """
    try:
        result_dir = os.path.join(RESULTS_DIR, result_id)
        
        # Check if result exists
        if not os.path.exists(result_dir):
            return jsonify({'error': 'Result not found'}), 404
        
        # Delete the entire result directory
        shutil.rmtree(result_dir)
        
        print(f"🗑️  Deleted exercise result: {result_id}")
        return jsonify({'message': 'Result deleted successfully', 'id': result_id}), 200
        
    except Exception as e:
        print(f"❌ Error deleting exercise result {result_id}: {e}")
        return jsonify({'error': 'Failed to delete result', 'details': str(e)}), 500


@app.route('/api/exercise-results/<result_id>/video')
def serve_result_video(result_id):
    """Serve annotated video for a specific result"""
    result_dir = os.path.join(RESULTS_DIR, result_id)
    video_path = os.path.join(result_dir, 'annotated_video.mp4')
    
    if not os.path.exists(video_path):
        return jsonify({'error': 'Video not found'}), 404
    
    return send_from_directory(result_dir, 'annotated_video.mp4')


@app.route('/api/exercise-results/<result_id>/timeline')
def serve_result_timeline(result_id):
    """Serve timeline CSV for a specific result"""
    result_dir = os.path.join(RESULTS_DIR, result_id)
    csv_path = os.path.join(result_dir, 'timeline.csv')
    
    if not os.path.exists(csv_path):
        return jsonify({'error': 'Timeline not found'}), 404
    
    return send_from_directory(result_dir, 'timeline.csv')


@app.route('/api/analyze-video-with-output', methods=['POST'])
def analyze_video_with_output():
    """
    Analyze video and return annotated video + results
    (Optional endpoint for future use)
    """
    # TODO: Implement if needed
    return jsonify({'error': 'Not implemented yet'}), 501


@app.route('/api/generate-meal-plan', methods=['POST'])
def generate_meal_plan():
    """
    Generate a personalized 7-day meal plan using LLM
    
    Expects JSON body with:
        - age: int
        - gender: string (Turkish: "Erkek" or "Kadın", or English: "Male" or "Female")
        - height: float (cm)
        - weight: float (kg)
        - targetWeight: float (kg)
        - weeklyGoal: float (kg per week)
        - goal: string (Turkish: "Kilo almak"/"Kilo vermek", or English goal text)
        
    Returns:
        JSON with diet_plan (7 days) and notes
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract and validate required fields
        required_fields = ['age', 'gender', 'height', 'weight', 'targetWeight', 'weeklyGoal', 'goal']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missingFields': missing_fields
            }), 400
        
        # Map Turkish terms to English
        gender = data['gender']
        if gender.lower() in ['erkek', 'male', 'm']:
            gender = 'Male'
        elif gender.lower() in ['kadın', 'female', 'f']:
            gender = 'Female'
        
        goal = data['goal']
        goal_lower = goal.lower()
        
        # Map Turkish/English goal terms
        if any(word in goal_lower for word in ['almak', 'artırmak', 'gain', 'bulk', 'kas']):
            # "Kilo almak", "Kas oranını artırmak", "muscle gain"
            goal = 'muscle_gain'
        elif any(word in goal_lower for word in ['vermek', 'azaltmak', 'lose', 'burn', 'yağ']):
            # "Kilo vermek", "Yağ oranını azaltmak", "fat burn"
            goal = 'fat_burn'
        elif 'korumak' in goal_lower or 'maintain' in goal_lower:
            # "Formumu korumak" - default to muscle_gain for maintenance
            goal = 'muscle_gain'
        else:
            # Default to muscle_gain if unclear
            goal = 'muscle_gain'
        
        print(f"📊 Generating meal plan for user:")
        print(f"   Age: {data['age']}, Gender: {gender}")
        print(f"   Height: {data['height']}cm, Weight: {data['weight']}kg")
        print(f"   Target: {data['targetWeight']}kg, Goal: {goal}")
        
        # Load dataset
        df = mpm.load_dataset()
        
        # Generate meal plan using the LLM
        plan = mpm.generate_plan_for_user(
            df=df,
            age=int(data['age']),
            gender=gender,
            height_cm=float(data['height']),
            weight_kg=float(data['weight']),
            target_weight_kg=float(data['targetWeight']),
            weekly_goal_kg=float(data['weeklyGoal']),
            goal_text=goal,
            hf_api_key=os.getenv('HF_API_KEY')        )
        
        print("✅ Meal plan generated successfully")
        
        return jsonify(plan), 200
        
    except ValueError as e:
        print(f"❌ Value error: {str(e)}")
        return jsonify({
            'error': 'Invalid input data',
            'details': str(e)
        }), 400
        
    except Exception as e:
        print(f"❌ Error generating meal plan: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to generate meal plan',
            'details': str(e)
        }), 500


if __name__ == '__main__':
    # Get port from environment or default to 5000 for local dev
    port = int(os.getenv('PORT', 5000))
    is_azure = os.getenv('WEBSITE_SITE_NAME') is not None
    
    print("🚀 Starting SentriFit Exercise Analysis Server...")
    if is_azure:
        print(f"☁️  Running on Azure App Service")
        print(f"📍 Port: {port}")
    else:
        print(f"📍 Server will be available at http://localhost:{port}")
        print(f"📍 For Android Emulator, use http://10.0.2.2:{port}")
        print(f"📍 For iOS Simulator, use http://localhost:{port}")
        print(f"📍 For Real Device, use http://<YOUR_LOCAL_IP>:{port}")
    
    print("\n🔍 Endpoints:")
    print("   GET  /api/health")
    print("   POST /api/analyze-video")
    print("   POST /api/generate-meal-plan")
    print("\n")
    
    # Run server (0.0.0.0 = listen on all network interfaces)
    # In production, Gunicorn will be used instead
    debug_mode = not is_azure
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
