"use client";

import React, { useState, useEffect } from 'react';
import { FolderOpen, Grid3X3, List, Search, Filter, Trash2, Eye, Play, Clock, FileText, RefreshCw } from 'lucide-react';

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

const ManageSection: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  // Fetch all videos
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/videos`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
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
        fetchVideos(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: Network error');
    }
  };

  // Process video with immediate status tracking
  const processVideo = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}/process`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Immediately refresh to show processing status
        await fetchVideos();
        
        // Start intensive monitoring for this video
        startIntensiveMonitoring(videoId);
      } else {
        const error = await response.json();
        alert(`Processing failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Processing error:', error);
    }
  };

  // Intensive monitoring for specific video
  const startIntensiveMonitoring = React.useCallback((videoId: number) => {
    const checkVideo = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
        if (response.ok) {
          const video = await response.json();
          
          if (video.status === 'completed' || video.status === 'failed') {
            // Video finished processing - refresh immediately
            await fetchVideos();
          } else if (video.status === 'processing' || video.status === 'queued') {
            // Still processing - check again soon
            setTimeout(checkVideo, 2000); // Check every 2 seconds for active processing
          }
        }
      } catch (error) {
        console.error('Video monitoring error:', error);
      }
    };

    // Start checking immediately
    setTimeout(checkVideo, 1000);
  }, []);

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
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'queued': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter and sort videos
  const filteredAndSortedVideos = videos
    .filter(video => {
      const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           video.video_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || video.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        case 'size':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return 0;
      }
    });

  useEffect(() => {
    fetchVideos();

    // Listen for video upload events from other sections
    const handleVideoUpload = () => {
      fetchVideos();
    };

    const handleVideoProcessing = (event: CustomEvent<{ videoId: number }>) => {
      const videoId = event.detail.videoId;
      startIntensiveMonitoring(videoId);
      fetchVideos();
    };

    const handleVideoCompletion = () => {
      fetchVideos();
    };

    // Add event listeners
    window.addEventListener('videoUploaded', handleVideoUpload as EventListener);
    window.addEventListener('videoProcessingStarted', handleVideoProcessing as EventListener);
    window.addEventListener('videoProcessingCompleted', handleVideoCompletion as EventListener);

    return () => {
      window.removeEventListener('videoUploaded', handleVideoUpload as EventListener);
      window.removeEventListener('videoProcessingStarted', handleVideoProcessing as EventListener);
      window.removeEventListener('videoProcessingCompleted', handleVideoCompletion as EventListener);
    };
  }, [startIntensiveMonitoring]);

  // Auto-refresh for processing videos (less frequent since we have intensive monitoring)
  useEffect(() => {
    const interval = setInterval(() => {
      if (videos.some(v => v.status === 'processing' || v.status === 'queued')) {
        fetchVideos();
      }
    }, 15000); // Reduced frequency since we have targeted monitoring

    return () => clearInterval(interval);
  }, [videos]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your video library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-purple-600 rounded-2xl shadow-lg">
              <FolderOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Manage Your Library
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organize, search, and manage all your videos in one place. Monitor processing status and access your content.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filters & Controls */}
            <div className="flex items-center space-x-4">
              
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="uploaded">Uploaded</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name' | 'size')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="size">Largest First</option>
              </select>

              {/* View Mode */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={fetchVideos}
                className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{videos.length}</div>
            <div className="text-sm text-gray-600">Total Videos</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{videos.filter(v => v.status === 'completed').length}</div>
            <div className="text-sm text-gray-600">Processed</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{videos.filter(v => v.status === 'processing' || v.status === 'queued').length}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {formatFileSize(videos.reduce((sum, v) => sum + (v.file_size || 0), 0))}
            </div>
            <div className="text-sm text-gray-600">Total Size</div>
          </div>
        </div>

        {/* Video Library */}
        {filteredAndSortedVideos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Upload your first video to get started.'}
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredAndSortedVideos.map((video) => (
              <div
                key={video.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'p-4' : 'p-6'
                }`}
              >
                {viewMode === 'grid' ? (
                  /* Grid View */
                  <div className="space-y-4">
                    {/* Video Icon & Status */}
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <FileText className="h-8 w-8 text-purple-600" />
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(video.status)}`}>
                        {video.status}
                      </span>
                    </div>

                    {/* Video Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                        {video.title}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatDuration(video.duration)}
                        </div>
                        <div>{formatFileSize(video.file_size)}</div>
                        {video.video_type && (
                          <div className="text-purple-600 font-medium">{video.video_type}</div>
                        )}
                        <div className="text-xs">{new Date(video.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {video.status === 'uploaded' && (
                        <button
                          onClick={() => processVideo(video.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Play className="h-4 w-4" />
                          <span>Process</span>
                        </button>
                      )}
                      {video.status === 'completed' && (
                        <button
                          onClick={() => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' })}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteVideo(video.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List View */
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {video.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(video.status)}`}>
                          {video.status}
                        </span>
                        {video.video_type && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            {video.video_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(video.duration)}
                        </span>
                        <span>{formatFileSize(video.file_size)}</span>
                        <span>{new Date(video.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {video.status === 'uploaded' && (
                        <button
                          onClick={() => processVideo(video.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <Play className="h-4 w-4" />
                          <span>Process</span>
                        </button>
                      )}
                      {video.status === 'completed' && (
                        <button
                          onClick={() => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' })}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteVideo(video.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSection;