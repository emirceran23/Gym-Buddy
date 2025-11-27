from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import tempfile
import json
from werkzeug.utils import secure_filename

# Add the scripts directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from biceps_curl_video_analyzer import BicepsCurlVideoAnalyzer

app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'GymBuddy Exercise Analysis Server'
    })


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
        
        print(f"📹 Processing video: {filename}")
        
        # Create output directory for annotated videos
        output_dir = os.path.join(os.path.dirname(__file__), 'static', 'videos')
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Create analyzer with visualization enabled
            analyzer = BicepsCurlVideoAnalyzer(
                video_path=temp_video_path,
                visualize=True,  # Enable annotated video creation
                output_dir=output_dir
            )
            
            # Run analysis
            analyzer.analyze()
            
            # Get results as dictionary
            results = analyzer.get_results_dict()
            
            # Get annotated video filename - use the temp filename base, not the original
            # The analyzer saves with basename of video_path (which includes upload_PID prefix)
            temp_base = os.path.splitext(os.path.basename(temp_video_path))[0]
            annotated_filename = f"{temp_base}__annotated.mp4"
            annotated_video_path = os.path.join(output_dir, annotated_filename)
            
            # Verify the file was actually created
            if not os.path.exists(annotated_video_path):
                print(f"⚠️  Warning: Annotated video not found at {annotated_video_path}")
                results['annotatedVideoUrl'] = None
            else:
                results['annotatedVideoUrl'] = f"/static/videos/{annotated_filename}"
                print(f"✅ Annotated video saved: {annotated_filename}")
            
            print(f"✅ Analysis complete: {results['totalReps']} total reps")
            
            return jsonify(results), 200
            
        finally:
            # Cleanup: remove temporary uploaded video file
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
                print(f"🧹 Cleaned up temporary upload file")
    
    except Exception as e:
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


@app.route('/api/analyze-video-with-output', methods=['POST'])
def analyze_video_with_output():
    """
    Analyze video and return annotated video + results
    (Optional endpoint for future use)
    """
    # TODO: Implement if needed
    return jsonify({'error': 'Not implemented yet'}), 501


if __name__ == '__main__':
    print("🚀 Starting GymBuddy Exercise Analysis Server...")
    print("📍 Server will be available at http://localhost:5000")
    print("📍 For Android Emulator, use http://10.0.2.2:5000")
    print("📍 For iOS Simulator, use http://localhost:5000")
    print("📍 For Real Device, use http://<YOUR_LOCAL_IP>:5000")
    print("\n🔍 Endpoints:")
    print("   GET  /api/health")
    print("   POST /api/analyze-video")
    print("\n")
    
    # Run server (0.0.0.0 = listen on all network interfaces)
    app.run(host='0.0.0.0', port=5000, debug=True)
