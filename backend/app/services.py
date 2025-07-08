import os
import tempfile
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models import Video, Transcript, TranscriptSegment, Summary, Quote
from pathlib import Path

# Try to import optional dependencies
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("Warning: Whisper not available. Run: pip install openai-whisper")

try:
    import moviepy
    from moviepy.video.io.VideoFileClip import VideoFileClip
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    print("Warning: MoviePy not available. Run: pip install moviepy")

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: Transformers not available. Run: pip install transformers")

class VideoProcessor:
    def __init__(self):
        # Create temp directory for processing 
        # The services.py file is in backend/app/, so we need to go up one level to get to backend/
        current_file_dir = Path(__file__).parent  # This is backend/app/
        backend_dir = current_file_dir.parent     # This is backend/
        self.temp_dir = backend_dir / "temp_audio"
        self.temp_dir.mkdir(exist_ok=True)
        
        print(f"Services file location: {current_file_dir}")
        print(f"Backend directory: {backend_dir}")
        print(f"Temp audio directory: {self.temp_dir.resolve()}")
        
        # Initialize models only if libraries are available
        self.whisper_model = None
        self.summarizer = None
        
        if WHISPER_AVAILABLE:
            try:
                self.whisper_model = whisper.load_model(os.getenv("WHISPER_MODEL", "base"))
                print("Whisper model loaded successfully")
            except Exception as e:
                print(f"Failed to load Whisper model: {e}")
        
        if TRANSFORMERS_AVAILABLE:
            try:
                self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
                print("Summarization model loaded successfully")
            except Exception as e:
                print(f"Failed to load summarization model: {e}")
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video file and return path to audio file"""
        if not MOVIEPY_AVAILABLE:
            raise Exception("MoviePy not available. Please install with: pip install moviepy")
        
        print(f"Extracting audio from: {video_path}")
        print(f"Current working directory: {os.getcwd()}")
        
        if not os.path.exists(video_path):
            raise Exception(f"Video file not found: {video_path}")
        
        # Change to backend directory to ensure consistent file creation
        original_cwd = os.getcwd()
        backend_dir = Path(__file__).parent.parent  # Go from app/ to backend/
        os.chdir(backend_dir)
        print(f"Changed to backend directory: {os.getcwd()}")
        
        try:
            # Use simple filename in current directory (backend/)
            audio_filename = "temp_audio.wav"
            print(f"Will create audio file: {audio_filename}")
            
            # Remove existing file if it exists
            if os.path.exists(audio_filename):
                os.remove(audio_filename)
                print("Removed existing audio file")
            
            # Load video using relative path from backend directory
            video_rel_path = os.path.relpath(os.path.join(original_cwd, video_path))
            print(f"Video relative path: {video_rel_path}")
            
            # Load video
            print("Loading video file...")
            video = VideoFileClip(video_rel_path)
            print(f"Video loaded successfully. Duration: {video.duration} seconds")
            
            # Extract audio
            print("Extracting audio...")
            audio = video.audio
            
            if audio is None:
                raise Exception("Video file has no audio track")
            
            print(f"Audio track found. Duration: {audio.duration} seconds")
            
            # Write audio file
            print(f"Writing audio to: {audio_filename}")
            audio.write_audiofile(
                audio_filename, 
                verbose=True,
                logger='bar'
            )
            
            print("Audio write completed")
            
            # Verify file exists
            if not os.path.exists(audio_filename):
                # List all files in current directory
                files = [f for f in os.listdir('.') if f.endswith('.wav')]
                print(f"WAV files in directory: {files}")
                raise Exception(f"Audio file not created: {audio_filename}")
            
            # Get absolute path for return
            abs_audio_path = os.path.abspath(audio_filename)
            file_size = os.path.getsize(abs_audio_path)
            print(f"Audio file created successfully: {abs_audio_path}")
            print(f"File size: {file_size} bytes")
            
            # Clean up video objects
            audio.close()
            video.close()
            
            return abs_audio_path
            
        except Exception as e:
            print(f"Audio extraction error: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to extract audio: {str(e)}")
        finally:
            # Always restore original working directory
            os.chdir(original_cwd)
            print(f"Restored working directory to: {os.getcwd()}")
    
    def transcribe_audio(self, audio_path: str) -> Dict:
        """Transcribe audio using Whisper"""
        if not self.whisper_model:
            raise Exception("Whisper model not available")
        
        print(f"Transcribing audio: {audio_path}")
        
        # Double-check file exists
        if not os.path.exists(audio_path):
            print(f"Audio file not found at: {audio_path}")
            raise Exception(f"Audio file not found: {audio_path}")
        
        # Check file size
        file_size = os.path.getsize(audio_path)
        print(f"Audio file size before transcription: {file_size} bytes")
        
        if file_size == 0:
            raise Exception("Audio file is empty")
        
        try:
            print("Starting Whisper transcription...")
            
            # Use absolute path for Whisper
            abs_audio_path = os.path.abspath(audio_path)
            print(f"Absolute audio path: {abs_audio_path}")
            
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                abs_audio_path,
                word_timestamps=True,
                verbose=False
            )
            print("Whisper transcription completed successfully!")
            return result
                
        except Exception as e:
            print(f"Transcription failed: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    def create_transcript_segments(self, whisper_result: Dict, transcript_id: int, db: Session):
        """Create transcript segments from Whisper result"""
        segments = []
        
        for segment in whisper_result.get("segments", []):
            db_segment = TranscriptSegment(
                transcript_id=transcript_id,
                text=segment["text"].strip(),
                start_time=segment["start"],
                end_time=segment["end"],
                confidence=segment.get("avg_logprob", 0.0)
            )
            segments.append(db_segment)
        
        db.add_all(segments)
        db.commit()
        
        return segments
    
    def generate_summaries(self, full_text: str, video_id: int, db: Session):
        """Generate hierarchical summaries"""
        if not self.summarizer:
            # Create simple extractive summaries if transformers not available
            return self.create_simple_summaries(full_text, video_id, db)
        
        summaries = []
        
        # Split text into chunks if too long for model
        max_chunk_length = 1024
        text_chunks = [full_text[i:i+max_chunk_length] 
                      for i in range(0, len(full_text), max_chunk_length)]
        
        # Generate different summary lengths
        summary_configs = [
            {"type": "short", "max_length": 50, "min_length": 20},
            {"type": "medium", "max_length": 150, "min_length": 50},
            {"type": "long", "max_length": 300, "min_length": 100}
        ]
        
        for config in summary_configs:
            try:
                if len(full_text) < 100:  # Skip if text too short
                    continue
                
                # Summarize first chunk (or combine if multiple chunks)
                text_to_summarize = text_chunks[0] if len(text_chunks) == 1 else " ".join(text_chunks[:2])
                
                summary_result = self.summarizer(
                    text_to_summarize,
                    max_length=config["max_length"],
                    min_length=config["min_length"],
                    do_sample=False
                )
                
                summary_text = summary_result[0]["summary_text"]
                
                summary = Summary(
                    video_id=video_id,
                    summary_type=config["type"],
                    content=summary_text,
                    word_count=len(summary_text.split())
                )
                summaries.append(summary)
                
            except Exception as e:
                print(f"Failed to generate {config['type']} summary: {e}")
                continue
        
        db.add_all(summaries)
        db.commit()
        
        return summaries
    
    def create_simple_summaries(self, full_text: str, video_id: int, db: Session):
        """Create simple extractive summaries when transformers not available"""
        sentences = full_text.split('. ')
        
        summaries = []
        
        # Short summary: first 2 sentences
        if len(sentences) >= 2:
            short_summary = '. '.join(sentences[:2]) + '.'
            summaries.append(Summary(
                video_id=video_id,
                summary_type="short",
                content=short_summary,
                word_count=len(short_summary.split())
            ))
        
        # Medium summary: first 5 sentences
        if len(sentences) >= 5:
            medium_summary = '. '.join(sentences[:5]) + '.'
            summaries.append(Summary(
                video_id=video_id,
                summary_type="medium", 
                content=medium_summary,
                word_count=len(medium_summary.split())
            ))
        
        # Long summary: first 10 sentences
        if len(sentences) >= 10:
            long_summary = '. '.join(sentences[:10]) + '.'
            summaries.append(Summary(
                video_id=video_id,
                summary_type="long",
                content=long_summary,
                word_count=len(long_summary.split())
            ))
        
        db.add_all(summaries)
        db.commit()
        
        return summaries
    
    def extract_key_quotes(self, transcript_segments: List[TranscriptSegment], video_id: int, db: Session):
        """Extract key quotes and memorable moments"""
        quotes = []
        
        # Simple approach: find longer segments that might contain key insights
        for segment in transcript_segments:
            text = segment.text.strip()
            
            # Skip very short segments
            if len(text.split()) < 10:
                continue
            
            # Look for segments with question words, emphasis, or key phrases
            key_indicators = [
                "important", "key", "remember", "crucial", "essential",
                "what", "why", "how", "because", "therefore", "however",
                "first", "second", "finally", "conclusion", "summary"
            ]
            
            relevance_score = 0.0
            text_lower = text.lower()
            
            for indicator in key_indicators:
                if indicator in text_lower:
                    relevance_score += 0.1
            
            # Boost score for longer, complete thoughts
            if len(text.split()) > 20:
                relevance_score += 0.2
            
            # Only save quotes with decent relevance
            if relevance_score > 0.2:
                quote = Quote(
                    video_id=video_id,
                    text=text,
                    start_time=segment.start_time,
                    end_time=segment.end_time,
                    quote_type="key_point",
                    relevance_score=relevance_score
                )
                quotes.append(quote)
        
        # Sort by relevance and keep top 10
        quotes.sort(key=lambda x: x.relevance_score, reverse=True)
        top_quotes = quotes[:10]
        
        db.add_all(top_quotes)
        db.commit()
        
        return top_quotes
    
    def classify_video_type(self, transcript_text: str) -> str:
        """Simple video type classification based on content"""
        text_lower = transcript_text.lower()
        
        # Define keywords for different video types
        tutorial_keywords = ["how to", "step", "tutorial", "guide", "learn", "teach", "show you"]
        review_keywords = ["review", "opinion", "rating", "recommend", "pros", "cons", "compared"]
        educational_keywords = ["explain", "understand", "concept", "theory", "definition", "science"]
        entertainment_keywords = ["funny", "comedy", "laugh", "entertainment", "story", "vlog"]
        
        # Count keyword matches
        tutorial_score = sum(1 for keyword in tutorial_keywords if keyword in text_lower)
        review_score = sum(1 for keyword in review_keywords if keyword in text_lower)
        educational_score = sum(1 for keyword in educational_keywords if keyword in text_lower)
        entertainment_score = sum(1 for keyword in entertainment_keywords if keyword in text_lower)
        
        # Determine type based on highest score
        scores = {
            "tutorial": tutorial_score,
            "review": review_score,
            "educational": educational_score,
            "entertainment": entertainment_score
        }
        
        video_type = max(scores, key=scores.get)
        
        # Default to "general" if no clear category
        return video_type if scores[video_type] > 0 else "general"
    
    def process_video(self, video_id: int, db: Session):
        """Main processing pipeline for a video"""
        if not WHISPER_AVAILABLE:
            raise Exception("Cannot process video: Whisper not available. Please install with: pip install openai-whisper")
        
        if not MOVIEPY_AVAILABLE:
            raise Exception("Cannot process video: MoviePy not available. Please install with: pip install moviepy")
        
        try:
            print(f"Starting processing for video ID: {video_id}")
            
            # Get video from database
            video = db.query(Video).filter(Video.id == video_id).first()
            if not video:
                raise Exception("Video not found")
            
            print(f"Video found: {video.title}, file_path: {video.file_path}")
            
            # Update status
            video.status = "processing"
            db.commit()
            
            # Step 1: Extract audio
            print("Step 1: Extracting audio...")
            audio_path = self.extract_audio_from_video(video.file_path)
            print(f"Audio extracted successfully: {audio_path}")
            
            # Step 2: Transcribe with Whisper
            print("Step 2: Transcribing with Whisper...")
            whisper_result = self.transcribe_audio(audio_path)
            print("Transcription completed successfully")
            
            # Step 3: Save transcript
            print("Step 3: Saving transcript...")
            full_text = whisper_result.get("text", "")
            transcript = Transcript(
                video_id=video_id,
                full_text=full_text,
                language=whisper_result.get("language", "en")
            )
            db.add(transcript)
            db.commit()
            db.refresh(transcript)
            print(f"Transcript saved with ID: {transcript.id}")
            
            # Step 4: Create transcript segments
            print("Step 4: Creating transcript segments...")
            segments = self.create_transcript_segments(whisper_result, transcript.id, db)
            print(f"Created {len(segments)} transcript segments")
            
            # Step 5: Generate summaries
            summaries = []
            quotes = []
            if full_text:
                print("Step 5: Generating summaries...")
                summaries = self.generate_summaries(full_text, video_id, db)
                print(f"Generated {len(summaries)} summaries")
                
                # Step 6: Extract key quotes
                print("Step 6: Extracting key quotes...")
                quotes = self.extract_key_quotes(segments, video_id, db)
                print(f"Extracted {len(quotes)} key quotes")
                
                # Step 7: Classify video type
                print("Step 7: Classifying video type...")
                video_type = self.classify_video_type(full_text)
                video.video_type = video_type
                print(f"Video classified as: {video_type}")
            
            # Step 8: Update video status
            video.status = "completed"
            db.commit()
            print("Video processing completed successfully")
            
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                print("Temporary audio file cleaned up")
            
            return {
                "status": "success",
                "transcript_id": transcript.id,
                "segments_count": len(segments),
                "summaries_count": len(summaries),
                "quotes_count": len(quotes),
                "video_type": video.video_type
            }
            
        except Exception as e:
            print(f"Video processing failed: {e}")
            # Update video status on error
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                db.commit()
            
            # Clean up on error
            if 'audio_path' in locals() and os.path.exists(audio_path):
                os.remove(audio_path)
                print("Temporary audio file cleaned up after error")
            
            raise Exception(f"Video processing failed: {str(e)}")

# Create global processor instance
video_processor = VideoProcessor()