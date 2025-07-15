from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Video, Transcript, Summary, Quote, Base
from app.database import engine
from app.services import video_processor
import os
from dotenv import load_dotenv
from pathlib import Path
from app.youtube_service import youtube_service
from pydantic import BaseModel
import re

# Load environment variables
load_dotenv()
class YouTubeURLRequest(BaseModel):
    url: str

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
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = os.getenv("UPLOAD_FOLDER", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Check file size after reading
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024*1024)}MB")
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Verify file was written
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Failed to save file to disk")
        
        # Get video duration using moviepy
        duration = None
        try:
            from moviepy.video.io.VideoFileClip import VideoFileClip
            with VideoFileClip(file_path) as video_clip:
                duration = video_clip.duration
        except Exception as e:
            print(f"Warning: Could not get video duration: {e}")
            duration = None
        
        # Create video record
        video = Video(
            title=file.filename,
            filename=unique_filename,
            file_path=os.path.abspath(file_path),  # Use absolute path
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
            "duration": duration,
            "file_path": video.file_path
        }
        
    except Exception as e:
        # Clean up file if database operation fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.delete("/api/videos/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """Delete a video and all associated data"""
    try:
        # Get video from database
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Store file path before deleting from database
        file_path = video.file_path
        video_title = video.title
        
        # Check if video is currently being processed
        if video.status == "processing":
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete video while it's being processed. Please wait for processing to complete."
            )
        
        # Delete associated records in correct order (foreign key constraints)
        from app.models import TranscriptSegment
        
        # Step 1: Delete quotes (no foreign key dependencies)
        quotes_deleted = db.query(Quote).filter(Quote.video_id == video_id).delete()
        print(f"Deleted {quotes_deleted} quotes")
        
        # Step 2: Delete summaries (no foreign key dependencies)
        summaries_deleted = db.query(Summary).filter(Summary.video_id == video_id).delete()
        print(f"Deleted {summaries_deleted} summaries")
        
        # Step 3: Find ALL transcripts for this video and delete their segments
        transcripts = db.query(Transcript).filter(Transcript.video_id == video_id).all()
        segments_deleted = 0
        
        print(f"Found {len(transcripts)} transcripts for video {video_id}")
        
        for transcript in transcripts:
            print(f"Processing transcript ID: {transcript.id}")
            
            # Count segments before deletion for debugging
            segment_count = db.query(TranscriptSegment).filter(TranscriptSegment.transcript_id == transcript.id).count()
            print(f"Found {segment_count} segments for transcript {transcript.id}")
            
            # Delete segments for this transcript
            deleted_count = db.query(TranscriptSegment).filter(TranscriptSegment.transcript_id == transcript.id).delete()
            segments_deleted += deleted_count
            print(f"Deleted {deleted_count} segments from transcript {transcript.id}")
        
        # Commit segment deletions before proceeding
        db.commit()
        print(f"Total segments deleted: {segments_deleted}")
        
        # Step 4: Delete transcripts AFTER all segments are gone
        transcripts_deleted = db.query(Transcript).filter(Transcript.video_id == video_id).delete()
        print(f"Deleted {transcripts_deleted} transcripts")
        
        # Delete the video record
        db.delete(video)
        db.commit()
        
        # Now delete the physical file
        file_deleted = False
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                file_deleted = True
                print(f"Successfully deleted file: {file_path}")
            except OSError as e:
                print(f"Warning: Could not delete file {file_path}: {e}")
                # Don't raise an error here since the database record is already deleted
        
        return {
            "message": f"Video '{video_title}' deleted successfully",
            "video_id": video_id,
            "file_deleted": file_deleted,
            "records_deleted": {
                "video": 1,
                "transcripts": transcripts_deleted,
                "segments": segments_deleted,
                "summaries": summaries_deleted,
                "quotes": quotes_deleted
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400)
        raise
    except Exception as e:
        # Rollback database changes on any error
        db.rollback()
        print(f"Error deleting video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")

@app.delete("/api/videos/{video_id}/file-only")
def delete_video_file_only(video_id: int, db: Session = Depends(get_db)):
    """Delete only the video file, keep database records"""
    try:
        # Get video from database
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        file_path = video.file_path
        
        # Check if video is currently being processed
        if video.status == "processing":
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete video file while it's being processed"
            )
        
        # Delete the physical file
        file_deleted = False
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                file_deleted = True
                print(f"Successfully deleted file: {file_path}")
                
                # Update video record to reflect file is gone
                video.file_path = None
                video.status = "file_deleted"
                db.commit()
                
            except OSError as e:
                print(f"Error deleting file {file_path}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
        else:
            raise HTTPException(status_code=404, detail="Video file not found on disk")
        
        return {
            "message": f"Video file deleted successfully, database records preserved",
            "video_id": video_id,
            "file_deleted": file_deleted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting video file {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete video file: {str(e)}")

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

# Debug endpoint
@app.get("/api/videos/{video_id}/debug")
def debug_video(video_id: int, db: Session = Depends(get_db)):
    """Debug video file information"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {
        "video_id": video.id,
        "title": video.title,
        "filename": video.filename,
        "file_path": video.file_path,
        "file_exists": os.path.exists(video.file_path) if video.file_path else False,
        "file_size": video.file_size,
        "status": video.status
    }

@app.post("/api/videos/{video_id}/reset")
def reset_video_status(video_id: int, db: Session = Depends(get_db)):
    """Reset video status to uploaded for reprocessing"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video.status = "uploaded"
    db.commit()
    
    return {"message": f"Video {video_id} status reset to uploaded"}

# Search endpoint
@app.get("/api/search")
def search_videos(q: str, db: Session = Depends(get_db)):
    """Search across videos and transcripts"""
    # Basic search implementation - will be enhanced later
    videos = db.query(Video).filter(Video.title.contains(q)).all()
    return {"query": q, "results": videos}

@app.post("/api/youtube/validate")
async def validate_youtube_url(request: YouTubeURLRequest):
    """Validate and get info for a YouTube URL"""
    try:
        # Validate URL format
        if not youtube_service.validate_youtube_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Get video information
        info = youtube_service.get_video_info(request.url)
        
        # Check duration limit
        max_duration = int(os.getenv("MAX_YOUTUBE_DURATION", "1800"))  # 30 minutes
        if info['duration'] and info['duration'] > max_duration:
            raise HTTPException(
                status_code=400, 
                detail=f"Video too long. Maximum duration: {max_duration//60} minutes"
            )
        
        # Estimate file size warning
        approx_size = info.get('filesize_approx', 0)
        max_size = int(os.getenv("MAX_YOUTUBE_SIZE", "500")) * 1024 * 1024  # 500MB
        
        return {
            "valid": True,
            "info": {
                "title": info['title'],
                "duration": info['duration'],
                "uploader": info['uploader'],
                "view_count": info.get('view_count', 0),
                "thumbnail": info.get('thumbnail', ''),
                "estimated_size": approx_size,
                "estimated_size_mb": round(approx_size / (1024 * 1024), 1) if approx_size else "Unknown"
            },
            "warnings": [
                f"Estimated size: ~{round(approx_size / (1024 * 1024), 1)}MB" if approx_size else "Size unknown",
                f"Duration: {info['duration']//60}:{info['duration']%60:02d}" if info['duration'] else "Duration unknown"
            ] + ([f"Large file warning: Estimated size may exceed {max_size//(1024*1024)}MB limit"] if approx_size > max_size else [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to validate URL: {str(e)}")

@app.post("/api/youtube/download")
async def download_youtube_video(request: YouTubeURLRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Download a YouTube video and create a video record"""
    try:
        # Validate URL first
        if not youtube_service.validate_youtube_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Get video info
        info = youtube_service.get_video_info(request.url)
        
        # Create video record with 'downloading' status
        video = Video(
            title=info['title'],
            filename=f"youtube_{info['video_id']}.mp4",  # Will be updated after download
            file_path="",  # Will be updated after download
            file_size=0,  # Will be updated after download
            duration=info.get('duration'),
            youtube_url=request.url,
            status="downloading"
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        
        # Start background download and processing
        background_tasks.add_task(download_and_process_youtube, video.id, request.url, db)
        
        return {
            "message": "YouTube download started",
            "video_id": video.id,
            "title": info['title'],
            "status": "downloading"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download initiation failed: {str(e)}")

def download_and_process_youtube(video_id: int, url: str, db: Session):
    """Background task to download and process YouTube video"""
    try:
        print(f"Starting YouTube download for video {video_id}: {url}")
        
        # Get video record
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            print(f"Video {video_id} not found")
            return
        
        # Update status
        video.status = "downloading"
        db.commit()
        
        # Download the video
        download_result = youtube_service.download_video(url)
        
        # Move file to permanent location (same as regular uploads)
        upload_dir = os.getenv("UPLOAD_FOLDER", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename for permanent storage
        import uuid
        file_extension = os.path.splitext(download_result['filename'])[1]
        permanent_filename = f"{uuid.uuid4()}{file_extension}"
        permanent_path = os.path.join(upload_dir, permanent_filename)
        
        # Move file
        import shutil
        shutil.move(download_result['file_path'], permanent_path)
        
        # Update video record
        video.filename = permanent_filename
        video.file_path = os.path.abspath(permanent_path)
        video.file_size = download_result['file_size']
        video.status = "uploaded"  # Ready for processing
        db.commit()
        
        print(f"YouTube download completed for video {video_id}")
        
        # Auto-start processing
        from app.services import video_processor
        video.status = "processing"
        db.commit()
        
        result = video_processor.process_video(video_id, db)
        print(f"YouTube video {video_id} processed successfully: {result}")
        
    except Exception as e:
        print(f"YouTube download/processing failed for video {video_id}: {e}")
        
        # Update video status on error
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "failed"
            db.commit()
        
        # Clean up any partial files
        youtube_service.cleanup_temp_files()

# Add this cleanup endpoint as well
@app.post("/api/youtube/cleanup")
async def cleanup_youtube_temp():
    """Clean up temporary YouTube files"""
    try:
        youtube_service.cleanup_temp_files()
        return {"message": "Cleanup completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

# Update the existing process_video_task function to handle YouTube videos
def process_video_task(video_id: int, db: Session):
    """Background task for video processing (updated to handle YouTube videos)"""
    try:
        # Check if this is a YouTube video
        video = db.query(Video).filter(Video.id == video_id).first()
        if video and video.youtube_url:
            print(f"Processing YouTube video {video_id}: {video.youtube_url}")
        
        result = video_processor.process_video(video_id, db)
        print(f"Video {video_id} processed successfully: {result}")
    except Exception as e:
        print(f"Video {video_id} processing failed: {e}")