import os
import tempfile
import yt_dlp
from pathlib import Path
from typing import Dict, Optional
import uuid

class YouTubeService:
    def __init__(self):
        # Create temp directory for YouTube downloads
        current_file_dir = Path(__file__).parent
        self.temp_dir = current_file_dir / "temp_youtube"
        self.temp_dir.mkdir(exist_ok=True)
        
        # Configure yt-dlp options
        self.ydl_opts = {
            'format': 'best[ext=mp4]/best',  # Prefer mp4, fallback to best available
            'outtmpl': str(self.temp_dir / '%(id)s.%(ext)s'),
            'writesubtitles': False,
            'writeautomaticsub': False,
            'writedescription': False,
            'writeinfojson': True,  # We'll use this for metadata
            'no_warnings': True,
            'extract_flat': False,
        }
    
    def validate_youtube_url(self, url: str) -> bool:
        """Validate if the URL is a valid YouTube URL"""
        youtube_domains = [
            'youtube.com', 'www.youtube.com', 'm.youtube.com',
            'youtu.be', 'www.youtu.be'
        ]
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return any(domain in parsed.netloc for domain in youtube_domains)
        except:
            return False
    
    def get_video_info(self, url: str) -> Dict:
        """Get video information without downloading"""
        try:
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title', 'Unknown Title'),
                    'duration': info.get('duration', 0),
                    'description': info.get('description', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', ''),
                    'view_count': info.get('view_count', 0),
                    'video_id': info.get('id', ''),
                    'thumbnail': info.get('thumbnail', ''),
                    'filesize_approx': info.get('filesize_approx', 0),
                }
        except Exception as e:
            raise Exception(f"Failed to get video info: {str(e)}")
    
    def download_video(self, url: str) -> Dict:
        """Download YouTube video and return file path and metadata"""
        try:
            # Get video info first
            info = self.get_video_info(url)
            
            # Check duration limit (30 minutes = 1800 seconds)
            max_duration = int(os.getenv("MAX_YOUTUBE_DURATION", "1800"))
            if info['duration'] and info['duration'] > max_duration:
                raise Exception(f"Video too long. Maximum duration: {max_duration/60} minutes")
            
            # Download the video
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                ydl.download([url])
            
            # Find the downloaded file
            video_id = info['video_id']
            possible_extensions = ['mp4', 'webm', 'mkv', 'avi']
            
            downloaded_file = None
            for ext in possible_extensions:
                potential_file = self.temp_dir / f"{video_id}.{ext}"
                if potential_file.exists():
                    downloaded_file = potential_file
                    break
            
            if not downloaded_file:
                raise Exception("Downloaded file not found")
            
            # Get actual file size
            file_size = downloaded_file.stat().st_size
            
            # Check file size limit (500MB)
            max_size = int(os.getenv("MAX_YOUTUBE_SIZE", "500")) * 1024 * 1024
            if file_size > max_size:
                # Clean up and raise error
                downloaded_file.unlink()
                raise Exception(f"File too large. Maximum size: {max_size/(1024*1024)}MB")
            
            return {
                'file_path': str(downloaded_file.absolute()),
                'file_size': file_size,
                'filename': downloaded_file.name,
                'metadata': info
            }
            
        except Exception as e:
            # Clean up any partial downloads
            self.cleanup_temp_files(info.get('video_id', ''))
            raise Exception(f"Download failed: {str(e)}")
    
    def cleanup_temp_files(self, video_id: str = None):
        """Clean up temporary files"""
        try:
            if video_id:
                # Clean up specific video files
                for file in self.temp_dir.glob(f"{video_id}.*"):
                    file.unlink()
            else:
                # Clean up all temp files older than 1 hour
                import time
                current_time = time.time()
                for file in self.temp_dir.glob("*"):
                    if current_time - file.stat().st_mtime > 3600:  # 1 hour
                        file.unlink()
        except Exception as e:
            print(f"Cleanup error: {e}")

# Create global instance
youtube_service = YouTubeService()