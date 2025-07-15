import React, { useState, useEffect } from 'react';
import { Upload, Play, Trash2, FileText, Clock, Search, RefreshCw, Eye } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface Video {
  id: number;
  title: string;
  filename: string;
  file_path: string;
  file_size: number;
  duration?: number;
  video_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Transcript {
  id: number;
  video_id: number;
  full_text: string;
  language: string;
  created_at: string;
}

interface Summary {
  id: number;
  video_id: number;
  summary_type: string;
  content: string;
  word_count: number;
  created_at: string;
}

interface Quote {
  id: number;
  video_id: number;
  text: string;
  start_time: number;
  end_time: number;
  speaker?: string;
  quote_type: string;
  relevance_score: number;
  created_at: string;
}

const VideoDashboard: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Fetch all videos
  const fetchVideos = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/videos`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload video
  const handleUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/videos/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        fetchVideos();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: Network error');
    } finally {
      setUploading(false);
    }
  };

  // Process video
  const processVideo = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}/process`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Processing started:', result);
        fetchVideos();
      } else {
        const error = await response.json();
        alert(`Processing failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Processing error:', error);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: number) => {
    if (!confirm('Are you sure you want to delete this video and all its data?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Delete successful:', result);
        fetchVideos();
        if (selectedVideo?.id === videoId) {
          setSelectedVideo(null);
          setShowTranscript(false);
        }
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Fetch transcript
  const fetchTranscript = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}/transcript`);
      if (response.ok) {
        const data = await response.json();
        setTranscript(data);
      } else {
        setTranscript(null);
      }
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      setTranscript(null);
    }
  };

  // Fetch summaries
  const fetchSummaries = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}/summaries`);
      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries || []);
      } else {
        setSummaries([]);
      }
    } catch (error) {
      console.error('Failed to fetch summaries:', error);
      setSummaries([]);
    }
  };

  // Fetch quotes
  const fetchQuotes = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}/quotes`);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      } else {
        setQuotes([]);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      setQuotes([]);
    }
  };

  // View video details
  const viewVideoDetails = async (video: Video) => {
    setSelectedVideo(video);
    setShowTranscript(true);
    
    if (video.status === 'completed') {
      await Promise.all([
        fetchTranscript(video.id),
        fetchSummaries(video.id),
        fetchQuotes(video.id)
      ]);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'queued': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter videos based on search
  const filteredVideos = videos.filter(video =>
    video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.video_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchVideos();
  }, []);

  // Auto-refresh every 10 seconds for processing status
  useEffect(() => {
    const interval = setInterval(() => {
      if (videos.some(v => v.status === 'processing' || v.status === 'queued')) {
        fetchVideos();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [videos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Capsule</h1>
              <p className="text-gray-600 mt-1">Video content analysis and summarization</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchVideos()}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  className="hidden"
                  id="video-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className={`h-12 w-12 mb-4 ${uploading ? 'text-gray-400' : 'text-blue-600'}`} />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Support for MP4, MOV, AVI, MKV, WEBM files up to 500MB
                  </p>
                  {uploading && (
                    <div className="mt-4 w-full max-w-xs">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Videos List */}
            <div className="space-y-4">
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm ? 'No videos match your search.' : 'No videos uploaded yet.'}
                  </p>
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
                      selectedVideo?.id === video.id ? 'ring-2 ring-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {video.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(video.status)}`}>
                            {video.status}
                          </span>
                          {video.video_type && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              {video.video_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDuration(video.duration)}
                          </span>
                          <span>{formatFileSize(video.file_size)}</span>
                          <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {video.status === 'uploaded' && (
                          <button
                            onClick={() => processVideo(video.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Process Video"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {video.status === 'completed' && (
                          <button
                            onClick={() => viewVideoDetails(video)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteVideo(video.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Video"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {selectedVideo && showTranscript ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedVideo.title}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedVideo(null);
                      setShowTranscript(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {/* Summaries */}
                  {summaries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Summaries</h3>
                      <div className="space-y-3">
                        {summaries.map((summary) => (
                          <div key={summary.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-blue-600 uppercase">
                                {summary.summary_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {summary.word_count} words
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {summary.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quotes */}
                  {quotes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Key Quotes</h3>
                      <div className="space-y-3">
                        {quotes.map((quote) => (
                          <div key={quote.id} className="border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 italic mb-2">
                              &ldquo;{quote.text}&rdquo;
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatDuration(quote.start_time)}</span>
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {Math.round(quote.relevance_score * 100)}% relevance
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  {transcript && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Full Transcript</h3>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {transcript.full_text}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                          Language: {transcript.language}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVideo.status !== 'completed' && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">
                        {selectedVideo.status === 'processing' 
                          ? 'Processing in progress...' 
                          : 'Video not processed yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Video Selected</h3>
                <p className="text-gray-600">
                  Select a processed video to view its transcript, summaries, and key quotes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDashboard;