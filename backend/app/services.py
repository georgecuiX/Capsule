import os
import whisper
import moviepy.editor as mp
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models import Video, Transcript, TranscriptSegment, Summary, Quote
from transformers import pipeline
import tempfile
import shutil
from pathlib import Path

class VideoProcessor:
    def __init__(self):
        # Load Whisper model (using 'base' for good balance of speed/accuracy)
        self.whisper_model = whisper.load_model(os.getenv("WHISPER_MODEL", "base"))
        
        # Load summarization pipeline
        self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        
        # Create temp directory for processing
        self.temp_dir = Path(tempfile.gettempdir()) / "capsule_processing"
        self.temp_dir.mkdir(exist_ok=True)
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video file and return path to audio file"""
        try:
            # Load video
            video = mp.VideoFileClip(video_path)
            
            # Create temporary audio file
            audio_path = self.temp_dir / f"{Path(video_path).stem}_audio.wav"
            
            # Extract audio
            audio = video.audio
            audio.write_audiofile(str(audio_path), verbose=False, logger=None)
            
            # Clean up
            audio.close()
            video.close()
            
            return str(audio_path)
        
        except Exception as e:
            raise Exception(f"Failed to extract audio: {str(e)}")
    
    def transcribe_audio(self, audio_path: str) -> Dict:
        """Transcribe audio using Whisper"""
        try:
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_path,
                word_timestamps=True,
                verbose=False
            )
            
            return result
        
        except Exception as e:
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
        """Generate hierarchical summaries using BART"""
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
        try:
            # Get video from database
            video = db.query(Video).filter(Video.id == video_id).first()
            if not video:
                raise Exception("Video not found")
            
            # Update status
            video.status = "processing"
            db.commit()
            
            # Step 1: Extract audio
            audio_path = self.extract_audio_from_video(video.file_path)
            
            # Step 2: Transcribe with Whisper
            whisper_result = self.transcribe_audio(audio_path)
            
            # Step 3: Save transcript
            full_text = whisper_result.get("text", "")
            transcript = Transcript(
                video_id=video_id,
                full_text=full_text,
                language=whisper_result.get("language", "en")
            )
            db.add(transcript)
            db.commit()
            db.refresh(transcript)
            
            # Step 4: Create transcript segments
            segments = self.create_transcript_segments(whisper_result, transcript.id, db)
            
            # Step 5: Generate summaries
            if full_text:
                summaries = self.generate_summaries(full_text, video_id, db)
                
                # Step 6: Extract key quotes
                quotes = self.extract_key_quotes(segments, video_id, db)
                
                # Step 7: Classify video type
                video_type = self.classify_video_type(full_text)
                video.video_type = video_type
            
            # Step 8: Update video status
            video.status = "completed"
            db.commit()
            
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return {
                "status": "success",
                "transcript_id": transcript.id,
                "segments_count": len(segments),
                "summaries_count": len(summaries) if full_text else 0,
                "quotes_count": len(quotes) if full_text else 0,
                "video_type": video.video_type
            }
            
        except Exception as e:
            # Update video status on error
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                db.commit()
            
            # Clean up on error
            if 'audio_path' in locals() and os.path.exists(audio_path):
                os.remove(audio_path)
            
            raise Exception(f"Video processing failed: {str(e)}")

# Create global processor instance
video_processor = VideoProcessor()