from app.database import engine
from app.models import Base, Video, Transcript, TranscriptSegment, Summary, Quote, ProcessingTask
import os

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

def create_upload_directory():
    """Create upload directory if it doesn't exist"""
    upload_dir = os.getenv("UPLOAD_FOLDER", "uploads")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        print(f"Created upload directory: {upload_dir}")

def initialize_database():
    """Initialize database with tables and directories"""
    create_tables()
    create_upload_directory()
    print("Database initialization complete!")

if __name__ == "__main__":
    initialize_database()