import os
import tempfile
from pathlib import Path
from typing import Dict, Optional
import uuid
import time

try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
    print("yt-dlp imported successfully")
except ImportError:
    YT_DLP_AVAILABLE = False
    print("Warning: yt-dlp not installed. YouTube functionality will be disabled.")

class YouTubeService:
    def __init__(self):
        if not YT_DLP_AVAILABLE:
            print("YouTube service initialized without yt-dlp. Install with: pip install yt-dlp")
            return
            
        # Create temp directory for YouTube downloads
        current_file_dir = Path(__file__).parent
        self.temp_dir = current_file_dir / "temp_youtube"
        self.temp_dir.mkdir(exist_ok=True)
        print(f"YouTube temp directory: {self.temp_dir}")
        
        # Updated yt-dlp options to handle recent YouTube changes
        self.ydl_opts = {
            # Use more conservative format selection
            'format': 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',
            'outtmpl': str(self.temp_dir / '%(id)s.%(ext)s'),
            
            # Disable unnecessary features
            'writesubtitles': False,
            'writeautomaticsub': False,
            'writedescription': False,
            'writeinfojson': False,
            'writeannotations': False,
            'writethumbnail': False,
            
            # Anti-bot measures
            'extractor_retries': 3,
            'fragment_retries': 3,
            'retries': 3,
            
            # Headers to avoid detection
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            
            # Other options
            'no_warnings': False,
            'extract_flat': False,
            'ignoreerrors': False,
            'no_check_certificate': True,
            
            # Force IPv4 to avoid some connection issues
            'force_ipv4': True,
        }
        
        # Info extraction options (lighter)
        self.info_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'skip_download': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'force_ipv4': True,
        }
    
    def validate_youtube_url(self, url: str) -> bool:
        """Validate if the URL is a valid YouTube URL"""
        if not YT_DLP_AVAILABLE:
            return False
            
        youtube_domains = [
            'youtube.com', 'www.youtube.com', 'm.youtube.com',
            'youtu.be', 'www.youtu.be'
        ]
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return any(domain in parsed.netloc for domain in youtube_domains)
        except Exception as e:
            print(f"URL validation error: {e}")
            return False
    
    def get_video_info(self, url: str) -> Dict:
        """Get video information without downloading"""
        if not YT_DLP_AVAILABLE:
            raise Exception("yt-dlp not available. Please install with: pip install yt-dlp")
            
        try:
            print(f"Getting video info for: {url}")
            
            # Use lighter options for info extraction
            with yt_dlp.YoutubeDL(self.info_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Check if we actually got video formats (not just images)
                formats = info.get('formats', [])
                video_formats = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
                
                if not video_formats:
                    # Try to get basic info anyway
                    print("Warning: No video formats found, but got basic info")
                
                result = {
                    'title': info.get('title', 'Unknown Title'),
                    'duration': info.get('duration', 0),
                    'description': info.get('description', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', ''),
                    'view_count': info.get('view_count', 0),
                    'video_id': info.get('id', ''),
                    'thumbnail': info.get('thumbnail', ''),
                    'filesize_approx': info.get('filesize_approx', 0),
                    'has_video': len(video_formats) > 0,
                }
                print(f"Video info retrieved: {result['title']} ({result['duration']}s) - Video available: {result['has_video']}")
                return result
                
        except Exception as e:
            print(f"Error getting video info: {e}")
            raise Exception(f"Failed to get video info: {str(e)}")
    
    def download_video(self, url: str) -> Dict:
        """Download YouTube video and return file path and metadata"""
        if not YT_DLP_AVAILABLE:
            raise Exception("yt-dlp not available. Please install with: pip install yt-dlp")
            
        print(f"Starting download for: {url}")
        
        try:
            # Get video info first
            info = self.get_video_info(url)
            video_id = info['video_id']
            
            # Check if video has actual video content
            if not info.get('has_video', True):
                raise Exception("This video doesn't have downloadable video content (might be images only or unavailable)")
            
            # Check duration limit (30 minutes = 1800 seconds)
            max_duration = int(os.getenv("MAX_YOUTUBE_DURATION", "1800"))
            if info['duration'] and info['duration'] > max_duration:
                raise Exception(f"Video too long. Maximum duration: {max_duration/60} minutes")
            
            print(f"Downloading video: {info['title']}")
            
            # Clean up any existing files first
            self.cleanup_temp_files(video_id)
            
            # Download with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"Download attempt {attempt + 1}/{max_retries}")
                    
                    # Add some delay between retries
                    if attempt > 0:
                        time.sleep(2)
                    
                    with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                        ydl.download([url])
                    break
                    
                except yt_dlp.DownloadError as e:
                    print(f"Download attempt {attempt + 1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise e
                    continue
            
            print("Download completed, looking for file...")
            
            # Find the downloaded file - be more flexible with extensions
            possible_extensions = ['mp4', 'webm', 'mkv', 'avi', 'flv', 'm4a', 'mp3']
            downloaded_file = None
            
            # First, list all files to see what we got
            all_files = list(self.temp_dir.glob(f"{video_id}.*"))
            print(f"Files found for {video_id}: {[f.name for f in all_files]}")
            
            # Filter out non-video files
            for file in all_files:
                if file.suffix.lower() in ['.mp4', '.webm', '.mkv', '.avi', '.flv']:
                    downloaded_file = file
                    print(f"Found video file: {downloaded_file}")
                    break
            
            if not downloaded_file:
                # If no video file found, check if we have audio-only
                for file in all_files:
                    if file.suffix.lower() in ['.m4a', '.mp3', '.webm'] and file.stat().st_size > 1024:
                        downloaded_file = file
                        print(f"Found audio file: {downloaded_file}")
                        break
            
            if not downloaded_file:
                # List all files in temp directory for debugging
                all_temp_files = list(self.temp_dir.glob("*"))
                print(f"All files in temp directory: {[f.name for f in all_temp_files]}")
                raise Exception(f"No suitable download found. Expected video file for {video_id}")
            
            # Get actual file size
            file_size = downloaded_file.stat().st_size
            print(f"Downloaded file size: {file_size} bytes ({file_size / (1024*1024):.1f}MB)")
            
            # Check file size limit (500MB)
            max_size = int(os.getenv("MAX_YOUTUBE_SIZE", "500")) * 1024 * 1024
            if file_size > max_size:
                # Clean up and raise error
                downloaded_file.unlink()
                raise Exception(f"File too large ({file_size / (1024*1024):.1f}MB). Maximum size: {max_size/(1024*1024)}MB")
            
            # Verify file is not corrupted (basic check)
            if file_size < 1024:  # Less than 1KB is suspicious
                downloaded_file.unlink()
                raise Exception("Downloaded file appears to be corrupted (too small)")
            
            return {
                'file_path': str(downloaded_file.absolute()),
                'file_size': file_size,
                'filename': downloaded_file.name,
                'metadata': info
            }
            
        except Exception as e:
            print(f"Download error: {e}")
            # Clean up any partial downloads
            self.cleanup_temp_files(info.get('video_id', '') if 'info' in locals() else None)
            raise Exception(f"Download failed: {str(e)}")
    
    def cleanup_temp_files(self, video_id: str = None):
        """Clean up temporary files"""
        if not YT_DLP_AVAILABLE:
            return
            
        try:
            if video_id:
                # Clean up specific video files
                for file in self.temp_dir.glob(f"{video_id}.*"):
                    print(f"Cleaning up: {file}")
                    file.unlink()
            else:
                # Clean up all temp files older than 1 hour
                import time
                current_time = time.time()
                for file in self.temp_dir.glob("*"):
                    if current_time - file.stat().st_mtime > 3600:  # 1 hour
                        print(f"Cleaning up old file: {file}")
                        file.unlink()
        except Exception as e:
            print(f"Cleanup error: {e}")

# Create global instance
youtube_service = YouTubeService()