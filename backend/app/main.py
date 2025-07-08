from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Video, Transcript, Summary, Quote, Base
from app.database import engine
from app.services import video_processor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Create upload directory
upload_dir = os.getenv("UPLOAD_FOLDER", "uploads")
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)

app = FastAPI(
    title="Capsule API",
    description="Video content summarization and analysis API",
    version="1.0.0"
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def read_root():
    return {"message": "Capsule API is running!", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

# Video endpoints
@app.get("/api/videos")
def get_videos(db: Session = Depends(get_db)):
    """Get all videos"""
    videos = db.query(Video).all()
    return {"videos": videos}

@app.get("/api/videos/{video_id}")
def get_video(video_id: int, db: Session = Depends(get_db)):
    """Get a specific video by ID"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@app.post("/api/videos/upload")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a video file"""
    # Basic validation
    if not file.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid file format")
    
    # Check file size (limit to 500MB as per env config)
    max_size = int(os.getenv("MAX_UPLOAD_SIZE", "500")) * 1024 * 1024  # Convert MB to bytes
    if file.size and file.size > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024*1024)}MB")
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = os.getenv("UPLOAD_FOLDER", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Get file info
        file_size = len(content)
        
        # Get video duration using moviepy
        try:
            import moviepy.editor as mp
            with mp.VideoFileClip(file_path) as video_clip:
                duration = video_clip.duration
        except:
            duration = None
        
        # Create video record
        video = Video(
            title=file.filename,
            filename=unique_filename,
            file_path=file_path,
            file_size=file_size,
            duration=duration,
            status="uploaded"
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        
        return {
            "message": "Video uploaded successfully", 
            "video_id": video.id,
            "filename": unique_filename,
            "size": file_size,
            "duration": duration
        }
        
    except Exception as e:
        # Clean up file if database operation fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Transcript endpoints
@app.get("/api/videos/{video_id}/transcript")
def get_transcript(video_id: int, db: Session = Depends(get_db)):
    """Get transcript for a video"""
    transcript = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcript

# Summary endpoints
@app.get("/api/videos/{video_id}/summaries")
def get_summaries(video_id: int, db: Session = Depends(get_db)):
    """Get all summaries for a video"""
    summaries = db.query(Summary).filter(Summary.video_id == video_id).all()
    return {"summaries": summaries}

# Quote endpoints
@app.get("/api/videos/{video_id}/quotes")
def get_quotes(video_id: int, db: Session = Depends(get_db)):
    """Get all quotes for a video"""
    quotes = db.query(Quote).filter(Quote.video_id == video_id).all()
    return {"quotes": quotes}

# Processing endpoints
@app.post("/api/videos/{video_id}/process")
def process_video(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Start processing a video (transcription, summarization, etc.)"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video.status not in ["uploaded", "failed"]:
        raise HTTPException(status_code=400, detail=f"Video cannot be processed. Current status: {video.status}")
    
    # Add processing task to background
    background_tasks.add_task(process_video_task, video_id, db)
    
    # Update status immediately
    video.status = "queued"
    db.commit()
    
    return {"message": "Video processing started", "video_id": video_id, "status": "queued"}

def process_video_task(video_id: int, db: Session):
    """Background task for video processing"""
    try:
        result = video_processor.process_video(video_id, db)
        print(f"Video {video_id} processed successfully: {result}")
    except Exception as e:
        print(f"Video {video_id} processing failed: {e}")

# Search endpoint
@app.get("/api/search")
def search_videos(q: str, db: Session = Depends(get_db)):
    """Search across videos and transcripts"""
    # Basic search implementation - will be enhanced later
    videos = db.query(Video).filter(Video.title.contains(q)).all()
    return {"query": q, "results": videos}