# 🎥 Capsule - AI-Powered Video Analysis Platform

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<div align="center">
  <p><em>A full-stack AI-powered video analysis platform that transforms uploaded files and YouTube videos into searchable, actionable insights</em></p>
</div>

## 🌟 Overview

Capsule is an intelligent video content management system that combines cutting-edge AI technology with modern web development to revolutionize how you interact with video content. Whether you're processing educational materials, business presentations, or entertainment content, Capsule automatically transcribes, summarizes, and extracts key insights from both uploaded files and YouTube videos.

Built with a focus on user experience and powered by OpenAI's Whisper for transcription and advanced transformer models for analysis, Capsule transforms hours of video content into organized, searchable knowledge that you can access instantly.

## ✨ Key Features

### 🎯 Dual Input Processing
- **File Upload Support** - Direct upload of MP4, MOV, AVI, MKV, and WEBM files up to 500MB
- **YouTube Integration** - Seamless processing of YouTube videos via URL with automatic download
- **Smart Validation** - Real-time URL validation and video metadata preview
- **Format Optimization** - Automatic format selection and quality optimization

### 🤖 AI-Powered Analysis Engine
- **Whisper Transcription** - Industry-leading speech-to-text with multi-language support
- **Hierarchical Summarization** - Short, medium, and long summaries using BART transformer models
- **Key Quote Extraction** - Intelligent identification of important moments with relevance scoring
- **Content Classification** - Automatic video type detection (tutorial, review, educational, entertainment)

### 📊 Intelligent Content Organization
- **Advanced Search** - Full-text search across all transcripts with highlighting
- **Source Identification** - Clear visual indicators for uploaded vs. YouTube content
- **Processing Status** - Real-time monitoring of transcription and analysis progress
- **Metadata Tracking** - Comprehensive video information including duration, file size, and timestamps

### 🔍 Advanced Management Tools
- **Smart Filtering** - Filter by source type, processing status, and content type
- **Multiple View Modes** - Grid and list views for different browsing preferences
- **Bulk Operations** - Efficient management of multiple videos
- **Export Capabilities** - Access to raw transcripts, summaries, and quotes

## 🏗️ Tech Stack

### Frontend
- **Next.js** - React framework with server-side rendering and optimization
- **TypeScript** - Type-safe JavaScript with enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework with custom animations
- **Lucide React** - Beautiful, customizable icons
- **Custom Hooks** - Reusable logic for video processing and status management

### Backend
- **FastAPI** - Modern, fast Python web framework with automatic API documentation
- **SQLAlchemy** - Powerful ORM for database interactions
- **PostgreSQL** - Robust relational database for production use
- **Pydantic** - Data validation and serialization with type hints
- **Background Tasks** - Asynchronous processing for video analysis

### AI & Processing
- **OpenAI Whisper** - State-of-the-art automatic speech recognition
- **Transformers (HuggingFace)** - BART model for text summarization
- **yt-dlp** - Reliable YouTube video downloading with format selection
- **MoviePy** - Video processing and audio extraction
- **Custom Algorithms** - Proprietary quote extraction and relevance scoring

## 🛠️ Installation & Setup

### Prerequisites
- **Python 3.8+** - Backend runtime environment
- **Node.js 18+** - Frontend development environment
- **PostgreSQL 12+** - Database server
- **ffmpeg** - Video processing library (for MoviePy)

### Installation Steps

**1. Clone the Repository**
```bash
git clone https://github.com/yourusername/capsule.git
cd capsule
```

**2. Backend Setup**
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Configure your database URL and other settings in .env
```

**3. Database Setup**
```bash
# Start PostgreSQL service
# Create database named 'capsule'
createdb capsule

# Initialize database tables
python -c "from app import initialize_database; initialize_database()"

# --ALTERNATIVE--
# Start PostgreSQL with Docker
docker-compose up postgres
```

**4. Frontend Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

**5. Start the Application**

**Backend Server** (Terminal 1):
```bash
cd backend
uvicorn app.main:app --reload
# Server will start on http://localhost:8000
```

**Frontend Application** (Terminal 2):
```bash
cd frontend
npm run dev
# Application will open at http://localhost:3000
```

## 🚀 Usage Guide

### Getting Started
1. **Upload Content** - Choose between file upload or YouTube URL input
2. **Monitor Processing** - Watch real-time progress as AI analyzes your content
3. **Explore Results** - Navigate through transcripts, summaries, and key quotes
4. **Search & Filter** - Use powerful search tools to find specific information
5. **Manage Library** - Organize your processed videos with advanced filtering

### Key Workflows
- **Content Processing** → Upload/URL → AI Analysis → Results Available
- **Content Discovery** → Search → Filter → Analyze → Export
- **Library Management** → View All → Filter by Source → Process → Analyze

### Advanced Features
- **Timestamp Navigation** - Click on quotes to jump to specific video moments
- **Multi-language Support** - Automatic language detection and transcription
- **Batch Processing** - Process multiple videos simultaneously
- **Real-time Updates** - Live status updates across all sections
## 📄 License

This project is licensed under the MIT License
