from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)  # in bytes
    duration = Column(Float)  # in seconds
    video_type = Column(String)  # auto-tagged type (tutorial, review, etc.)
    youtube_url = Column(String, nullable=True)  # Store original YouTube URL
    status = Column(String, default="uploading")  # uploading, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transcript = relationship("Transcript", back_populates="video", uselist=False)
    summaries = relationship("Summary", back_populates="video")
    quotes = relationship("Quote", back_populates="video")

class Transcript(Base):
    __tablename__ = "transcripts"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    full_text = Column(Text)  # Complete transcript text
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    video = relationship("Video", back_populates="transcript")
    segments = relationship("TranscriptSegment", back_populates="transcript")

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"))
    text = Column(Text)
    start_time = Column(Float)  # in seconds
    end_time = Column(Float)  # in seconds
    speaker = Column(String, nullable=True)  # speaker identification
    confidence = Column(Float, nullable=True)  # transcription confidence
    
    # Relationships
    transcript = relationship("Transcript", back_populates="segments")

class Summary(Base):
    __tablename__ = "summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    summary_type = Column(String)  # "short", "medium", "long"
    content = Column(Text)
    word_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    video = relationship("Video", back_populates="summaries")

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    text = Column(Text)
    start_time = Column(Float)  # in seconds
    end_time = Column(Float)  # in seconds
    speaker = Column(String, nullable=True)
    quote_type = Column(String)  # "memorable", "key_point", "funny", etc.
    relevance_score = Column(Float)  # AI-generated relevance score
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    video = relationship("Video", back_populates="quotes")

class ProcessingTask(Base):
    __tablename__ = "processing_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    task_type = Column(String)  # "transcription", "summarization", "quote_extraction", etc.
    status = Column(String, default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)